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



class UserBankAccount(models.Model):
    name = models.CharField
    account_number = models.CharField
    bank_code = models.CharField
    bank_name = models.CharField

    created_at = models.DateTimeField

    class Meta:
        unique_together = ()

        
    def __str__(self):
        return f""



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
    STATUS = [('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed'), ('reversed', 'Reversed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.CharField(max_length=64, unique=True)
    from_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='sent_transactions', null=True, blank=True)
    to_account = models.IntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=18, decimal_places=2, validators=[MinValueValidator(0.01)])
    description = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)



class LedgerEntry(models.Model):
    """Append-only. Never edit or delete a row — post a reversing entry instead."""
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
