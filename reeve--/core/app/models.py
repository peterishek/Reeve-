from decimal import Decimal
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


COUNTRY_CURRENCY = {
    'NG': 'NGN',
    'CA': 'CAD',
    'GB': 'GBP',
    'US': 'USD',
}


class UserProfile(models.Model):
    """Where the user registered — determines their default account currency."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    country = models.CharField(max_length=2)  # ISO country code: 'NG', 'CA', 'GB', 'US'...

    def __str__(self):
        return f"{self.user} — {self.country}"


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('kids', 'Kids'),
        ('corporate', 'Corporate'),
        ('offshore', 'Offshore'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accounts')
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    currency = models.CharField(max_length=3, blank=True)  # auto-set from user's country at creation
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(balance__gte=0), name='balance_non_negative')
        ]

    def save(self, *args, **kwargs):
        if not self.currency:
            self.currency = COUNTRY_CURRENCY.get(self.user.profile.country, 'USD')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_account_type_display()} ({self.currency}) — {self.user}"


class Bank(models.Model):
    """
    Reference list of real banks — synced periodically from Paystack's
    /bank endpoint (accounts/paystack.py: list_banks()), not typed by
    users. This is what fills the "select your bank" dropdown on the
    frontend, and supplies the bank_code Paystack needs to resolve an
    account number.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True)  # Paystack's bank code, e.g. '058' for GTBank
    country = models.CharField(max_length=2, default='NG')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class UserBankAccount(models.Model):
    """
    A saved, VERIFIED beneficiary. `account_name` must come from
    Paystack's account-resolve response, never typed by the user directly
    — that's what makes this "verified" rather than just another form
    field. Reused across multiple future transfers so the user doesn't
    re-verify the same recipient every time.

    NOTE: this is a convenience/reuse cache, not the source of truth for
    a completed transfer. See Transaction's recipient_* fields below for
    why the actual transfer record freezes its own copy of these details
    instead of pointing back here live.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='beneficiaries')
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name='user_accounts')
    account_number = models.CharField(max_length=20)
    account_name = models.CharField(max_length=255)  # from Paystack's resolve response — never user-typed
    is_verified = models.BooleanField(default=False)
    paystack_recipient_code = models.CharField(max_length=64, blank=True)  # from Paystack's create-recipient call
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'bank', 'account_number')]

    def __str__(self):
        return f"{self.account_name} — {self.bank.name} •••{self.account_number[-4:]}"


class Card(models.Model):
    CARD_TYPES = [('debit', 'Debit'), ('credit', 'Credit')]
    STATUS = [('active', 'Active'), ('frozen', 'Frozen'), ('cancelled', 'Cancelled')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='cards')
    card_type = models.CharField(max_length=10, choices=CARD_TYPES)
    last_four = models.CharField(max_length=4)  # never store full PAN/CVV — use a real card processor for that
    expiry_month = models.PositiveSmallIntegerField()
    expiry_year = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=10, choices=STATUS, default='active')
    credit_limit = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)  # credit cards only
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.card_type} •••• {self.last_four}"


class Hold(models.Model):
    """Active holds (card auths, pending transfers) that reduce spendable
    balance without yet being a settled ledger entry."""
    STATUS = [('active', 'Active'), ('released', 'Released'), ('captured', 'Captured')]
    REASON = [('card_auth', 'Card authorization'), ('pending_transfer', 'Pending transfer'), ('dispute', 'Dispute hold')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='holds')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    reason = models.CharField(max_length=20, choices=REASON)
    status = models.CharField(max_length=10, choices=STATUS, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)


class Transaction(models.Model):
    """
    One shape covers all three transfer types below — the branching is
    just which fields get filled, not a different model per type:

      local          from_account + to_account (raw ID) + to_account_resolved
      external       from_account + recipient_* fields + optional
                      `beneficiary` link, bank_code = a real Paystack code
      international  from_account + recipient_* fields, bank_code blank,
                      recipient_swift_bic optionally set instead

    Why recipient_* — and now `to_account` too — are plain CharFields
    instead of a live FK: same principle as `currency`/`balance_after` on
    LedgerEntry — a completed transfer is a frozen fact. A foreign key
    only works cleanly when the target is guaranteed to already be a
    real row in this database; a beneficiary is very often NOT an
    existing Reeve customer at all (that's the entire point of
    external/international transfers), so forcing an FK there was never
    right. Even for `local` transfers, `to_account` stores the raw
    identifier the sender actually entered — `to_account_resolved` is
    kept alongside it purely as an optional convenience/audit link, the
    same pattern as `beneficiary` below, and is never the source of
    truth for what the transfer record itself says.

    This also answers "how do you resolve different bank types": you
    don't need a different foreign key per bank/country — every bank
    scheme, and even Reeve's own accounts, ultimately resolve to the
    same flat text shape. CharField is deliberately type-agnostic
    across all of them.
    """
    STATUS = [('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'), ('reversed', 'Reversed')]
    TRANSFER_TYPE = [
        ('local', 'Local'),                 # Reeve account → Reeve account
        ('external', 'External (domestic)'),  # Reeve account → verified bank via Paystack
        ('international', 'International'),    # Reeve account → unverified cross-border recipient
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.CharField(max_length=64, unique=True)
    from_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='sent_transactions', null=True, blank=True)

    # Raw recipient identifier as the sender entered it — frozen, local
    # transfers only. Authoritative: this is what the record says was
    # sent to, regardless of whether it still resolves to a live account.
    to_account = models.CharField(max_length=64, blank=True)
    # Optional convenience link, set only when to_account currently
    # resolves to a real Account. on_delete=SET_NULL (not PROTECT) —
    # deleting a Reeve account should never be blocked just because it
    # once received a transfer; the raw to_account text still preserves
    # the historical record either way.
    to_account_resolved = models.ForeignKey(Account, on_delete=models.SET_NULL, related_name='received_transactions', null=True, blank=True)

    transfer_type = models.CharField(max_length=15, choices=TRANSFER_TYPE, default='local')
    amount = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional convenience link — which saved beneficiary this transfer
    # used, if any. Never the source of truth for what was actually sent;
    # see the class docstring above.
    beneficiary = models.ForeignKey(UserBankAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    # Frozen recipient snapshot — filled for external/international only.
    recipient_account_name = models.CharField(max_length=255, blank=True)
    recipient_account_number = models.CharField(max_length=34, blank=True)  # long enough for an IBAN
    recipient_bank_name = models.CharField(max_length=255, blank=True)
    recipient_bank_code = models.CharField(max_length=20, blank=True)  # Paystack bank code — blank for international
    recipient_swift_bic = models.CharField(max_length=11, blank=True)  # international only
    recipient_country = models.CharField(max_length=2, blank=True)
    purpose = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['transfer_type', 'created_at']),
        ]


class LedgerEntry(models.Model):
    """
    Append-only. Never edit or delete a row — post a reversing entry
    instead.

    NOTE on external/international transfers: these post only ONE
    LedgerEntry (a debit on the sender), not the usual balanced
    debit+credit pair — the money is leaving Reeve entirely, so there's
    no Reeve account on the receiving end to credit. That's not a bug:
    real banks handle this by crediting an internal "correspondent bank
    / nostro" GL account instead, which this prototype doesn't model
    (see the earlier discussion on the bank's own internal ledger vs.
    the customer sub-ledger built here). Flagging it so the
    reconciliation command doesn't look "broken" for these — it's simply
    out of scope for this MVP.
    """
    DIRECTIONS = [('debit', 'Debit'), ('credit', 'Credit')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='entries')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='ledger_entries')
    direction = models.CharField(max_length=6, choices=DIRECTIONS)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=3)  # frozen at write-time — never inherited live from account.currency
    balance_before = models.DecimalField(max_digits=18, decimal_places=2)
    balance_after = models.DecimalField(max_digits=18, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['account', 'currency', 'created_at']),
        ]
        verbose_name_plural = "Ledger Entries"