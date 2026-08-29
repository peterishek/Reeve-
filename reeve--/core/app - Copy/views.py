import random
from datetime import date, datetime

from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Account, Card, LedgerEntry
from .permissions import IsStaffUser
from .serializers import (
    AccountSerializer,
    CardRequestSerializer,
    CardSerializer,
    EmailTokenObtainPairSerializer,
    TransferSerializer,
)
from .services import (
    CurrencyMismatch,
    DuplicateTransfer,
    InsufficientFunds,
    transfer,
)


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT obtain pair view that utilizes EmailTokenObtainPairSerializer
    to authenticate users with either email or username.
    """
    serializer_class = EmailTokenObtainPairSerializer


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
    except InsufficientFunds:
        return Response({'error': 'Insufficient funds'}, status=status.HTTP_400_BAD_REQUEST)
    except CurrencyMismatch:
        return Response({'error': 'Accounts are in different currencies'}, status=status.HTTP_400_BAD_REQUEST)
    except DuplicateTransfer:
        return Response({'error': 'This transfer was already processed'}, status=status.HTTP_409_CONFLICT)


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

    context = {
        'account': account,
        'user': request.user,
        'entries': entries,
        'statement_currency': currency or account.currency,
        'generated_at': datetime.now(),
        'period_from': entries.first().created_at if entries.exists() else None,
        'period_to': datetime.now(),
    }

    try:
        # Deferred import prevents system boot failure on machines missing GTK
        from weasyprint import HTML
        html_string = render_to_string('statements/account_statement.html', context)
        pdf_file = HTML(string=html_string).write_pdf()

        response = HttpResponse(pdf_file, content_type='application/pdf')
        suffix = f"-{currency}" if currency else ""
        response['Content-Disposition'] = f'attachment; filename="reeve-statement-{account_id}{suffix}.pdf"'
        return response
    except (ImportError, OSError):
        return Response(
            {'error': 'PDF rendering unavailable due to missing system dependencies.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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

    entries = entries.order_by('-created_at')[:500]

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