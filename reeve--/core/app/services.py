from django.db import transaction as db_transaction
from django.db.models import Sum
from .models import Account, Transaction, LedgerEntry, UserBankAccount, Bank
from app import paystack


class InsufficientFunds(Exception):
    pass


class CurrencyMismatch(Exception):
    pass


class DuplicateTransfer(Exception):
    pass


class AccountNotOwned(Exception):
    pass


class RecipientNotFound(Exception):
    """Raised when a local transfer's recipient account ID doesn't exist."""
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

        # A missing recipient is a routine user error (mistyped/pasted the
        # wrong ID), not a bug — this used to be an unhandled KeyError.
        if str(to_id) not in locked:
            raise RecipientNotFound
        if str(from_id) not in locked:
            # shouldn't happen in practice since the view already checks
            # ownership of from_id first, but stay defensive here too
            raise RecipientNotFound

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
            to_account=str(to_id),          # frozen raw identifier, as the sender entered it
            to_account_resolved=to_acc,      # convenience link — set because it resolved successfully here
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
    external bank via SWIFT/local rails, unverified (Paystack has no
    cross-border resolution). `recipient` is a dict with
    recipient_account_name, recipient_bank_name, recipient_account_number,
    recipient_country, and optionally recipient_swift_bic / purpose.

    The recipient snapshot is written directly onto the Transaction row
    (recipient_* fields) rather than a separate related model — see
    Transaction's class docstring for why a flat, frozen CharField shape
    covers every bank type without needing a different FK per type.

    Only debits the sender — see LedgerEntry's docstring for why this is
    a single-sided entry rather than the usual balanced pair, and why
    that's a deliberate MVP simplification rather than a bug.

    No FX conversion or fee is applied here — the amount debited is the
    amount entered, at face value, in the sender's own currency.
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
            # to_account intentionally omitted — blank CharField default
            # ("") is correct here, there's no Reeve account identifier
            # to freeze for an international transfer.
            transfer_type='international',
            amount=amount,
            description=description,
            status='pending',
            recipient_account_name=recipient['recipient_account_name'],
            recipient_bank_name=recipient['recipient_bank_name'],
            recipient_account_number=recipient['recipient_account_number'],
            recipient_country=recipient['recipient_country'],
            recipient_swift_bic=recipient.get('recipient_swift_bic', ''),
            purpose=recipient.get('purpose', ''),
        )

        from_before = from_acc.balance
        from_acc.balance -= amount
        from_acc.save()

        LedgerEntry.objects.create(
            transaction=txn, account=from_acc, direction='debit',
            amount=amount, currency=from_acc.currency,
            balance_before=from_before, balance_after=from_acc.balance,
        )

        # Marked 'pending' rather than 'completed' — a real cross-border
        # transfer takes days to actually settle at the receiving bank,
        # unlike the instant local transfer above.
        return txn


def external_transfer(from_id, amount, idempotency_key, beneficiary_id, description=""):
    """
    EXTERNAL (domestic) transfer — money leaves Reeve for a Paystack-
    VERIFIED bank account (a saved UserBankAccount). Unlike
    international_transfer, the recipient's identity has already been
    confirmed against the real bank via Paystack's account-resolve API
    at the point the beneficiary was saved — see accounts/paystack.py.

    Recipient details are still frozen onto the Transaction row (not
    read live from the beneficiary at display time), for the same
    reason as everywhere else in this ledger: a completed transfer must
    keep showing what was true when the money was sent, even if the
    beneficiary is later renamed or removed.

    Actually moving the money out to Paystack's transfer API is a
    separate integration step, deliberately not built here — this
    function only handles Reeve's own side: debiting the account and
    recording the transfer against a verified beneficiary.
    """
    if Transaction.objects.filter(idempotency_key=idempotency_key).exists():
        raise DuplicateTransfer

    with db_transaction.atomic():
        from_acc = Account.objects.select_for_update().get(id=from_id)
        beneficiary = UserBankAccount.objects.select_related('bank').get(id=beneficiary_id)

        if from_acc.balance < amount:
            raise InsufficientFunds

        txn = Transaction.objects.create(
            idempotency_key=idempotency_key,
            from_account=from_acc,
            # to_account intentionally omitted — same as international,
            # blank CharField default is correct for a non-Reeve recipient.
            transfer_type='external',
            amount=amount,
            description=description,
            status='pending',
            beneficiary=beneficiary,
            recipient_account_name=beneficiary.account_name,
            recipient_bank_name=beneficiary.bank.name,
            recipient_account_number=beneficiary.account_number,
            recipient_bank_code=beneficiary.bank.code,
            recipient_country=beneficiary.bank.country,
        )

        from_before = from_acc.balance
        from_acc.balance -= amount
        from_acc.save()

        LedgerEntry.objects.create(
            transaction=txn, account=from_acc, direction='debit',
            amount=amount, currency=from_acc.currency,
            balance_before=from_before, balance_after=from_acc.balance,
        )

        return txn


def available_balance(account):
    """Ledger balance minus any active holds (card auths, pending transfers)."""
    active_holds = account.holds.filter(status='active').aggregate(
        total=Sum('amount')
    )['total'] or 0
    return account.balance - active_holds


def resolve_recipient_local(account_id):
    """
    LOCAL check layer for the "local" transfer type — this is the
    free/instant branch of the resolution architecture: a Reeve account
    ID is already a trusted, existing record in our own DB, so no
    external API call is ever needed to "verify" it. Returns a small
    preview dict for the frontend to show before the user confirms, or
    None if no such account exists.
    """
    try:
        account = Account.objects.select_related('user').get(id=account_id)
    except (Account.DoesNotExist, ValueError):
        return None

    owner = account.user
    return {
        'account_type': account.account_type,
        'currency': account.currency,
        'owner_name': owner.get_full_name() or owner.username,
    }


def resolve_recipient_external(account_number, bank_code):
    """
    LOCAL-FIRST check layer for the "external" (domestic) transfer type.

    Order of checks:
      1. Has ANY user already verified this exact account_number +
         bank_code combination before? If so, reuse that confirmed name
         from our own `UserBankAccount` table — no API call at all.
      2. Otherwise, is `bank_code` a bank we actually have synced from
         Paystack (accounts.models.Bank)? If not, this almost certainly
         isn't a domestic bank Paystack can resolve — tell the caller to
         route to the international flow instead of trying and failing.
      3. Only if both of those pass do we actually call out to Paystack.

    Returns a dict: either {'source': 'cache'|'paystack', 'account_name': ...}
    or {'error': 'not_domestic_bank'} / raises on a genuine Paystack failure.
    """
    cached = UserBankAccount.objects.filter(
        bank__code=bank_code, account_number=account_number, is_verified=True
    ).first()
    if cached:
        return {'source': 'cache', 'account_number': cached.account_number, 'account_name': cached.account_name}

    if not Bank.objects.filter(code=bank_code, is_active=True).exists():
        return {'error': 'not_domestic_bank'}

    result = paystack.resolve_account(account_number, bank_code)
    return {'source': 'paystack', 'account_number': result['account_number'], 'account_name': result['account_name']}
