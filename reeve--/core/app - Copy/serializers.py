from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Account, Card, LedgerEntry

User = get_user_model()


# class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
#     """
#     Custom JWT serializer allowing users to log in with either 
#     their email address or their username in the standard 'username' field.
#     """
#     def validate(self, attrs):
#         username_or_email = attrs.get('username')
#         if username_or_email and '@' in username_or_email:
#             try:
#                 user = User.objects.get(email__iexact=username_or_email)
#                 attrs['username'] = user.username
#             except User.DoesNotExist:
#                 pass  # Fall back to parent validation, which will raise a clean 401 error
#         return super().validate(attrs)


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'account_type', 'currency', 'balance', 'created_at']
        read_only_fields = ['balance', 'currency']


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'account', 'card_type', 'last_four', 'expiry_month', 'expiry_year', 'status', 'credit_limit']
        read_only_fields = ['last_four']


class TransferSerializer(serializers.Serializer):
    from_account_id = serializers.UUIDField()
    to_account_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=0.01)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(max_length=64)


class CardRequestSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    card_type = serializers.ChoiceField(choices=['debit', 'credit'])
    credit_limit = serializers.DecimalField(max_digits=18, decimal_places=2, required=False, min_value=0)


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'account', 'direction', 'amount', 'currency', 'balance_before', 'balance_after', 'created_at']
        read_only_fields = ['id', 'account', 'direction', 'amount', 'currency', 'balance_before', 'balance_after', 'created_at']


        from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model, authenticate
from rest_framework import exceptions

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get('username')
        password = attrs.get('password')

        # 1. Resolve email to user instance if '@' is present
        user = None
        if username_or_email and '@' in username_or_email:
            user = User.objects.filter(email__iexact=username_or_email).first()
        
        if not user:
            user = User.objects.filter(username__iexact=username_or_email).first()

        # 2. Authenticate using the exact username registered in the DB
        if user:
            authenticated_user = authenticate(
                request=self.context.get('request'),
                username=user.username,
                password=password
            )

            if authenticated_user:
                if not authenticated_user.is_active:
                    raise exceptions.AuthenticationFailed('User account is disabled.')

                refresh = self.get_token(authenticated_user)
                return {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }

        raise exceptions.AuthenticationFailed('No active account found with the given credentials')