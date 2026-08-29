from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Account, Bank, UserBankAccount, Card, LedgerEntry, Transaction

User = get_user_model()


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Same login endpoint, same request shape ({"username": ..., "password":
    ...}) — but the value in `username` is looked up against either the
    real username OR email before handing off to simplejwt's normal
    validation. So the frontend doesn't need to change what it sends;
    it just stops mattering whether the person types their email or
    their actual username.
    """
    def validate(self, attrs):
        login_input = attrs.get(self.username_field)  # self.username_field == 'username' by default
        try:
            user = User.objects.get(Q(username__iexact=login_input) | Q(email__iexact=login_input))
            attrs[self.username_field] = user.username
        except User.DoesNotExist:
            pass  # let the parent raise its normal "no active account" error
        return super().validate(attrs)


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'account_type', 'currency', 'balance', 'created_at']
        read_only_fields = ['balance', 'currency']  # never settable by the client directly


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'account', 'card_type', 'last_four', 'expiry_month', 'expiry_year', 'status', 'credit_limit']
        read_only_fields = ['last_four']


class TransferSerializer(serializers.Serializer):
    """LOCAL transfer — Reeve account to Reeve account."""
    from_account_id = serializers.UUIDField()
    to_account_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=0.01)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=64)


class InternationalTransferSerializer(serializers.Serializer):
    """INTERNATIONAL transfer — unverified, free-text recipient (no Paystack coverage cross-border)."""
    from_account_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=0.01)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=64)
    recipient_account_name = serializers.CharField(max_length=255)
    recipient_bank_name = serializers.CharField(max_length=255)
    recipient_account_number = serializers.CharField(max_length=34)
    recipient_country = serializers.CharField(max_length=2)
    recipient_swift_bic = serializers.CharField(max_length=11, required=False, allow_blank=True)
    purpose = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ExternalTransferSerializer(serializers.Serializer):
    """EXTERNAL (domestic) transfer — to a saved, Paystack-verified UserBankAccount."""
    from_account_id = serializers.UUIDField()
    beneficiary_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=0.01)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=64)


class ResolveAccountSerializer(serializers.Serializer):
    """Input for the Paystack account-resolve step, before a beneficiary is saved."""
    account_number = serializers.CharField(max_length=20)
    bank_code = serializers.CharField(max_length=10)


class CardRequestSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    card_type = serializers.ChoiceField(choices=['debit', 'credit'])
    credit_limit = serializers.DecimalField(max_digits=18, decimal_places=2, required=False, min_value=0)


class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = ['id', 'name', 'code', 'country']


class UserBankAccountSerializer(serializers.ModelSerializer):
    bank = BankSerializer(read_only=True)

    class Meta:
        model = UserBankAccount
        fields = ['id', 'bank', 'account_number', 'account_name', 'is_verified', 'created_at']
        read_only_fields = ['account_name', 'is_verified']  # set by the resolve step, never client-supplied


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'account', 'direction', 'amount', 'currency', 'balance_before', 'balance_after', 'created_at']


class TransactionSerializer(serializers.ModelSerializer):
    """
    One flat serializer covers local/external/international — the
    recipient_* fields are simply blank for local transfers (where
    to_account/to_account_resolved are set instead). Matches the "one
    shape, not one model per type" design in Transaction's own docstring.
    """
    class Meta:
        model = Transaction
        fields = [
            'id', 'from_account', 'to_account', 'to_account_resolved', 'transfer_type', 'amount',
            'description', 'status', 'created_at',
            'recipient_account_name', 'recipient_bank_name', 'recipient_account_number',
            'recipient_bank_code', 'recipient_swift_bic', 'recipient_country', 'purpose',
        ]
