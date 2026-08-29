from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # auth — simplejwt ships these as CBVs, no FBV equivalent built in
    path('api/auth/login/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),

    # customer-facing
    path('api/accounts/', views.account_list),
    path('api/accounts/<uuid:account_id>/', views.account_detail),
    path('api/accounts/<uuid:account_id>/transactions/', views.transaction_history),
    path('api/accounts/<uuid:account_id>/statement/', views.account_statement_pdf),
    path('api/transfer/', views.transfer_funds),
    path('api/cards/', views.card_list),
    path('api/cards/request/', views.request_card),

    # staff / audit only
    path('api/institution/ledger/', views.institution_ledger),
]
