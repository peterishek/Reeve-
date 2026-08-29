from django.db import transaction as db_transaction
from django.db.models import Sum
from .models import Account, Transaction, LedgerEntry, InternationalTransferDetail


class InsufficientFunds(Exception):
    pass


class CurrencyMismatch(Exception):
    pass


class DuplicateTransfer(Exception):
    pass


class AccountNotOwned(Exception):
    pass


def transfer(from_id, to_id, amount, idempotency_key, description=""):
    """
    LOCAL transfer — moves `amount` between two Reeve accounts as a single
    atomic, row-locked operation. Writes a balanced pair of LedgerEntry
    rows (one debit, one credit) so the books always reconcile.
    """
    if Transaction.objects.filter(idempotency_key=idempotency_key).exists():
        raise DuplicateTransfer

    with db_transaction.atomic():
        # Lock both account rows in a consistent order (by id) to avoid deadlocks
        # when two transfers touch the same pair of accounts concurrently.
        ids = sorted([str(from_id), str(to_id)])
        locked = {
            str(a.id): a for a in Account.objects.select_for_update().filter(id__in=ids).order_by('id')
        }
        from_acc = locked[str(from_id)]
        to_acc = locked[str(to_id)]

        if from_acc.currency != to_acc.currency:
            # MVP: same-currency transfers only. Cross-currency needs an FX step.
            raise CurrencyMismatch

        if from_acc.balance < amount:
            raise InsufficientFunds

        txn = Transaction.objects.create(
            idempotency_key=idempotency_key,
            from_account=from_acc,
            to_account=to_acc,
            transfer_type='local',
            amount=amount,
            description=description,
            status='pending',
        )

        from_before = from_acc.balance
        from_acc.balance -= amount
        from_acc.save()

        to_before = to_acc.balance
        to_acc.balance += amount
        to_acc.save()

        LedgerEntry.objects.create(
            transaction=txn, account=from_acc, direction='debit',
            amount=amount, currency=from_acc.currency,
            balance_before=from_before, balance_after=from_acc.balance,
        )
        LedgerEntry.objects.create(
            transaction=txn, account=to_acc, direction='credit',
            amount=amount, currency=to_acc.currency,
            balance_before=to_before, balance_after=to_acc.balance,
        )

        txn.status = 'completed'
        txn.save()

        return txn


def international_transfer(from_id, amount, idempotency_key, recipient, description=""):
    """
    INTERNATIONAL transfer — money leaves Reeve entirely, going to an
    external bank via SWIFT/local rails. `recipient` is a dict with
    recipient_name, recipient_bank_name, recipient_account_number,
    recipient_country, and optionally recipient_swift_bic / purpose.

    Only debits the sender — see InternationalTransferDetail's docstring
    for why this is a single-sided ledger entry rather than the usual
    balanced pair, and why that's a deliberate MVP simplification rather
    than a bug.

    No FX conversion or fee is applied here — the amount debited is the
    amount entered, at face value, in the sender's own currency. A real
    international transfer would show a live exchange rate and a fee
    before the recipient's currency amount is finalized; that's real
    scope, just not built for this prototype.
    """
    if Transaction.objects.filter(idempotency_key=idempotency_key).exists():
        raise DuplicateTransfer

    with db_transaction.atomic():
        from_acc = Account.objects.select_for_update().get(id=from_id)

        if from_acc.balance < amount:
            raise InsufficientFunds

        txn = Transaction.objects.create(
            idempotency_key=idempotency_key,
            from_account=from_acc,
            to_account=None,
            transfer_type='international',
            amount=amount,
            description=description,
            status='pending',
        )

        from_before = from_acc.balance
        from_acc.balance -= amount
        from_acc.save()

        LedgerEntry.objects.create(
            transaction=txn, account=from_acc, direction='debit',
            amount=amount, currency=from_acc.currency,
            balance_before=from_before, balance_after=from_acc.balance,
        )

        InternationalTransferDetail.objects.create(
            transaction=txn,
            recipient_name=recipient['recipient_name'],
            recipient_bank_name=recipient['recipient_bank_name'],
            recipient_account_number=recipient['recipient_account_number'],
            recipient_country=recipient['recipient_country'],
            recipient_swift_bic=recipient.get('recipient_swift_bic', ''),
            purpose=recipient.get('purpose', ''),
        )

        # Marked 'pending' rather than 'completed' — a real cross-border
        # transfer takes days to actually settle at the receiving bank,
        # unlike the instant local transfer above.
        txn.status = 'pending'
        txn.save()

        return txn


def available_balance(account):
    """Ledger balance minus any active holds (card auths, pending transfers)."""
    active_holds = account.holds.filter(status='active').aggregate(
        total=Sum('amount')
    )['total'] or 0
    return account.balance - active_holds
