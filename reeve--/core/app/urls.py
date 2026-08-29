from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # auth — simplejwt ships these as CBVs, no FBV equivalent built in.
    # login now accepts either username or email in the same "username" field.
    path('api/auth/login/', views.EmailOrUsernameTokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),

    # customer-facing
    path('api/accounts/', views.account_list),
    path('api/accounts/<uuid:account_id>/', views.account_detail),
    path('api/accounts/lookup/<uuid:account_id>/', views.account_lookup),
    path('api/accounts/<uuid:account_id>/transactions/', views.transaction_history),
    path('api/accounts/<uuid:account_id>/statement/', views.account_statement_pdf),
    path('api/transfer/', views.transfer_funds),
    path('api/transfer/external/', views.external_transfer_view),
    path('api/transfer/international/', views.international_transfer_view),
    path('api/transactions/recent/', views.recent_transactions),
    path('api/cards/', views.card_list),
    path('api/cards/request/', views.request_card),
    path('api/banks/', views.bank_list),
    path('api/banks/resolve/', views.resolve_account_view),
    path('api/beneficiaries/', views.beneficiary_list_create),

    # staff / audit only
    path('api/institution/ledger/', views.institution_ledger),
]
