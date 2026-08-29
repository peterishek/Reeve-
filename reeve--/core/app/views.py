from django.http import HttpResponse
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime, date
import random
import requests as _requests

from .models import Account, Bank, UserBankAccount, Card, LedgerEntry, Transaction
from .pdf import generate_statement_pdf
from .serializers import (
    AccountSerializer, CardSerializer, TransferSerializer, CardRequestSerializer,
    InternationalTransferSerializer, ExternalTransferSerializer, ResolveAccountSerializer,
    TransactionSerializer, BankSerializer, UserBankAccountSerializer,
    EmailOrUsernameTokenObtainPairSerializer,
)
from .services import (
    transfer, international_transfer, external_transfer,
    resolve_recipient_local, resolve_recipient_external,
    InsufficientFunds, CurrencyMismatch, DuplicateTransfer, RecipientNotFound,
)
from . import paystack
from .permissions import IsStaffUser


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    """Same CBV exception as the plain login view — thin subclass of
    simplejwt's own view, just pointed at the serializer above."""
    serializer_class = EmailOrUsernameTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_list(request):
    """All accounts belonging to the logged-in user, across all currencies."""
    accounts = Account.objects.filter(user=request.user)
    serializer = AccountSerializer(accounts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_detail(request, account_id):
    try:
        account = Account.objects.get(id=account_id, user=request.user)
    except Account.DoesNotExist:
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(AccountSerializer(account).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_lookup(request, account_id):
    """
    LOCAL check layer for the "local" transfer type — the frontend calls
    this before letting the user proceed to review/send, so a mistyped
    or nonexistent recipient ID gets caught early with a clear message
    instead of failing at submit time. This is the "use local DB" branch
    of the resolution architecture: a Reeve account is already a
    trusted, existing record here, so no external API call is involved
    at all — unlike the external-transfer flow below, which does have to
    call out to Paystack. Deliberately not restricted to the requester's
    own accounts (any Reeve account can be looked up as a recipient
    preview) — only account_type/currency/owner_name are exposed, never
    balance or anything sensitive.
    """
    result = resolve_recipient_local(account_id)
    if result is None:
        return Response({'error': 'No Reeve account found with that ID'}, status=status.HTTP_404_NOT_FOUND)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def card_list(request):
    """Every card issued across every account the logged-in user owns."""
    cards = Card.objects.filter(account__user=request.user).select_related('account')
    return Response(CardSerializer(cards, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_card(request):
    """
    Issues a new card against one of the user's own accounts.
    Prototype only: generates a fake last_four/expiry rather than going
    through a real card processor — never store a full PAN/CVV yourself.
    """
    serializer = CardRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        account = Account.objects.get(id=data['account_id'], user=request.user)
    except Account.DoesNotExist:
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

    today = date.today()
    card = Card.objects.create(
        account=account,
        card_type=data['card_type'],
        last_four=f"{random.randint(0, 9999):04d}",
        expiry_month=today.month,
        expiry_year=today.year + 3,
        status='active',
        credit_limit=data.get('credit_limit') if data['card_type'] == 'credit' else None,
    )
    return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transfer_funds(request):
    """LOCAL transfer — between two Reeve accounts, same currency required."""
    serializer = TransferSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # ownership check — the sending account must belong to the requesting user
    if not Account.objects.filter(id=data['from_account_id'], user=request.user).exists():
        return Response({'error': 'Not your account'}, status=status.HTTP_403_FORBIDDEN)

    try:
        txn = transfer(
            from_id=data['from_account_id'],
            to_id=data['to_account_id'],
            amount=data['amount'],
            idempotency_key=data['idempotency_key'],
            description=data.get('description', ''),
        )
        return Response({'status': 'completed', 'transaction_id': str(txn.id)})
    except RecipientNotFound:
        return Response({'error': 'No Reeve account found with that recipient ID'}, status=status.HTTP_404_NOT_FOUND)
    except InsufficientFunds:
        return Response({'error': 'Insufficient funds'}, status=status.HTTP_400_BAD_REQUEST)
    except CurrencyMismatch:
        return Response({'error': 'Accounts are in different currencies'}, status=status.HTTP_400_BAD_REQUEST)
    except DuplicateTransfer:
        return Response({'error': 'This transfer was already processed'}, status=status.HTTP_409_CONFLICT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def international_transfer_view(request):
    """
    INTERNATIONAL transfer — money leaves Reeve to an external bank,
    unverified (no Paystack coverage cross-border). No matching Reeve
    account, so only a debit is posted (see LedgerEntry's docstring on
    why that's expected here).
    """
    serializer = InternationalTransferSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    if not Account.objects.filter(id=data['from_account_id'], user=request.user).exists():
        return Response({'error': 'Not your account'}, status=status.HTTP_403_FORBIDDEN)

    try:
        txn = international_transfer(
            from_id=data['from_account_id'],
            amount=data['amount'],
            idempotency_key=data['idempotency_key'],
            description=data.get('description', ''),
            recipient={
                'recipient_account_name': data['recipient_account_name'],
                'recipient_bank_name': data['recipient_bank_name'],
                'recipient_account_number': data['recipient_account_number'],
                'recipient_country': data['recipient_country'],
                'recipient_swift_bic': data.get('recipient_swift_bic', ''),
                'purpose': data.get('purpose', ''),
            },
        )
        return Response({'status': 'pending', 'transaction_id': str(txn.id)})
    except InsufficientFunds:
        return Response({'error': 'Insufficient funds'}, status=status.HTTP_400_BAD_REQUEST)
    except DuplicateTransfer:
        return Response({'error': 'This transfer was already processed'}, status=status.HTTP_409_CONFLICT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def external_transfer_view(request):
    """EXTERNAL (domestic) transfer — to a saved, Paystack-verified beneficiary."""
    serializer = ExternalTransferSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    if not Account.objects.filter(id=data['from_account_id'], user=request.user).exists():
        return Response({'error': 'Not your account'}, status=status.HTTP_403_FORBIDDEN)

    try:
        beneficiary = UserBankAccount.objects.get(id=data['beneficiary_id'], user=request.user)
    except UserBankAccount.DoesNotExist:
        return Response({'error': 'Beneficiary not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        txn = external_transfer(
            from_id=data['from_account_id'],
            amount=data['amount'],
            idempotency_key=data['idempotency_key'],
            beneficiary_id=beneficiary.id,
            description=data.get('description', ''),
        )
        return Response({'status': 'pending', 'transaction_id': str(txn.id)})
    except InsufficientFunds:
        return Response({'error': 'Insufficient funds'}, status=status.HTTP_400_BAD_REQUEST)
    except DuplicateTransfer:
        return Response({'error': 'This transfer was already processed'}, status=status.HTTP_409_CONFLICT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bank_list(request):
    """Banks available to pick from — synced into the Bank table from Paystack, not fetched live per request."""
    banks = Bank.objects.filter(is_active=True).order_by('name')
    return Response(BankSerializer(banks, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_account_view(request):
    """
    Resolution layer for the "external" (domestic) transfer type — checks
    local DB first before ever calling out to Paystack:

      1. Has ANY user already verified this exact account_number +
         bank_code before? Reuse that cached, confirmed name — no API
         call, no cost, instant.
      2. Is bank_code even a bank we've synced from Paystack (see
         accounts.models.Bank / `python manage.py sync_banks`)? If not,
         this almost certainly isn't a domestic bank at all — tell the
         frontend to route to the International tab instead of trying
         and failing against Paystack.
      3. Only then does this actually call Paystack live.

    This is a preview step either way — it does NOT save anything; the
    frontend shows the returned name for the user to confirm, then calls
    beneficiary_list_create with the same details.
    """
    serializer = ResolveAccountSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        result = resolve_recipient_external(data['account_number'], data['bank_code'])
    except _requests.HTTPError:
        return Response({'error': "Couldn't verify that account number against this bank"}, status=status.HTTP_400_BAD_REQUEST)

    if result.get('error') == 'not_domestic_bank':
        return Response(
            {'error': 'not_domestic_bank', 'message': "This bank code isn't recognized as a domestic bank we can verify. If this is a foreign bank, use the International transfer tab instead."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'account_number': result['account_number'], 'account_name': result['account_name'], 'source': result['source']})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def beneficiary_list_create(request):
    """
    GET  — every saved beneficiary belonging to the user.
    POST — saves a new one. Expects the SAME account_number/bank_code the
    user just resolved via resolve_account_view, plus the account_name
    that call returned (never a name the user typed themselves) — that's
    what keeps `is_verified=True` honest.
    """
    if request.method == 'GET':
        beneficiaries = UserBankAccount.objects.filter(user=request.user).select_related('bank')
        return Response(UserBankAccountSerializer(beneficiaries, many=True).data)

    bank_id = request.data.get('bank_id')
    account_number = request.data.get('account_number')
    account_name = request.data.get('account_name')  # from resolve_account_view's response

    if not all([bank_id, account_number, account_name]):
        return Response({'error': 'bank_id, account_number, and account_name are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        bank = Bank.objects.get(id=bank_id)
    except Bank.DoesNotExist:
        return Response({'error': 'Bank not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        recipient_code = paystack.create_transfer_recipient(account_name, account_number, bank.code)
    except _requests.HTTPError:
        return Response({'error': "Couldn't register this beneficiary with the payments provider"}, status=status.HTTP_400_BAD_REQUEST)

    beneficiary, _created = UserBankAccount.objects.update_or_create(
        user=request.user, bank=bank, account_number=account_number,
        defaults={'account_name': account_name, 'is_verified': True, 'paystack_recipient_code': recipient_code},
    )
    return Response(UserBankAccountSerializer(beneficiary).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_transactions(request):
    """
    Cross-account activity feed for the dashboard Overview page — every
    transaction (local, external, or international) the user sent or
    received, newest first. ?limit=5 controls how many (default 10).
    """
    limit = int(request.GET.get('limit', 10))
    user_account_ids = Account.objects.filter(user=request.user).values_list('id', flat=True)
    txns = (
        Transaction.objects
        .filter(Q(from_account_id__in=user_account_ids) | Q(to_account_resolved_id__in=user_account_ids))
        .order_by('-created_at')[:limit]
    )
    return Response(TransactionSerializer(txns, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_history(request, account_id):
    """?currency=USD to scope to one currency if the user filters by it."""
    try:
        account = Account.objects.get(id=account_id, user=request.user)
    except Account.DoesNotExist:
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

    entries = account.ledger_entries.order_by('-created_at')
    if currency := request.GET.get('currency'):
        entries = entries.filter(currency=currency)
    entries = entries[:50]

    data = [
        {
            'direction': e.direction,
            'amount': str(e.amount),
            'currency': e.currency,
            'balance_before': str(e.balance_before),
            'balance_after': str(e.balance_after),
            'created_at': e.created_at,
        }
        for e in entries
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_statement_pdf(request, account_id):
    """
    GET /api/accounts/<id>/statement/?currency=USD&from=2026-07-01&to=2026-08-01
    `currency` is optional — plain query filter, no separate currency-period model.
    """
    try:
        account = Account.objects.get(id=account_id, user=request.user)
    except Account.DoesNotExist:
        return HttpResponse(status=404)

    entries = account.ledger_entries.order_by('created_at')

    currency = request.GET.get('currency')
    if currency:
        entries = entries.filter(currency=currency)

    if date_from := request.GET.get('from'):
        entries = entries.filter(created_at__gte=date_from)
    if date_to := request.GET.get('to'):
        entries = entries.filter(created_at__lte=date_to)

    entries = list(entries)  # evaluate once — used for both the period lookup and the PDF body

    pdf_bytes = generate_statement_pdf(
        account=account,
        user=request.user,
        entries=entries,
        statement_currency=currency or account.currency,
        generated_at=datetime.now(),
        period_from=entries[0].created_at if entries else None,
        period_to=datetime.now(),
    )

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    suffix = f"-{currency}" if currency else ""
    response['Content-Disposition'] = f'attachment; filename="reeve-statement-{account_id}{suffix}.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsStaffUser])
def institution_ledger(request):
    """
    Bank-wide ledger view — no user scoping. Staff/audit only.
    Filters: ?currency=NGN&account_type=corporate&direction=debit&from=...&to=...
    """
    entries = LedgerEntry.objects.select_related('account', 'transaction').all()

    if currency := request.GET.get('currency'):
        entries = entries.filter(currency=currency)
    if acc_type := request.GET.get('account_type'):
        entries = entries.filter(account__account_type=acc_type)
    if direction := request.GET.get('direction'):
        entries = entries.filter(direction=direction)
    if date_from := request.GET.get('from'):
        entries = entries.filter(created_at__gte=date_from)
    if date_to := request.GET.get('to'):
        entries = entries.filter(created_at__lte=date_to)

    entries = entries.order_by('-created_at')[:500]  # paginate properly beyond MVP

    data = [
        {
            'id': str(e.id),
            'account_id': str(e.account_id),
            'account_type': e.account.account_type,
            'direction': e.direction,
            'amount': str(e.amount),
            'currency': e.currency,
            'balance_after': str(e.balance_after),
            'created_at': e.created_at,
        }
        for e in entries
    ]
    return Response(data)
