from django.contrib import admin
from django.db import models, transaction
from django.utils.html import format_html
from .models import UserProfile, Account, Card, Hold, Transaction, LedgerEntry


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'country', 'get_user_email')
    search_fields = ('user__username', 'user__email', 'country')
    list_filter = ('country',)

    @admin.display(description='Email')
    def get_user_email(self, obj):
        return obj.user.email


class CardInline(admin.TabularInline):
    model = Card
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('card_type', 'last_four', 'status', 'expiry_month', 'expiry_year', 'credit_limit', 'created_at')


class HoldInline(admin.TabularInline):
    model = Hold
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('amount', 'reason', 'status', 'expires_at', 'created_at')


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'account_type', 'currency', 'formatted_balance', 'created_at')
    list_filter = ('account_type', 'currency', 'created_at')
    search_fields = ('id', 'user__username', 'user__email')
    readonly_fields = ('id', 'created_at')
    inlines = [CardInline, HoldInline]

    @admin.display(description='Balance', ordering='balance')
    def formatted_balance(self, obj):
        return f"{obj.currency} {obj.balance:,.2f}"


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('masked_card', 'account', 'card_type', 'status', 'expiry_date', 'credit_limit', 'created_at')
    list_filter = ('card_type', 'status', 'created_at')
    search_fields = ('last_four', 'account__id', 'account__user__username')
    readonly_fields = ('id', 'created_at')

    @admin.display(description='Card')
    def masked_card(self, obj):
        return f"{obj.get_card_type_display()} •••• {obj.last_four}"

    @admin.display(description='Expires')
    def expiry_date(self, obj):
        return f"{obj.expiry_month:02d}/{obj.expiry_year}"


@admin.register(Hold)
class HoldAdmin(admin.ModelAdmin):
    list_display = ('id', 'account', 'amount', 'reason', 'status', 'expires_at', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('id', 'account__id', 'account__user__username')
    readonly_fields = ('id', 'created_at')
    actions = ['release_holds']

    @admin.action(description='Release selected active holds')
    def release_holds(self, request, queryset):
        updated = queryset.filter(status='active').update(status='released')
        self.message_user(request, f"Successfully released {updated} active hold(s).")


class LedgerEntryInline(admin.TabularInline):
    model = LedgerEntry
    extra = 0
    can_delete = False
    readonly_fields = ('id', 'account', 'direction', 'amount', 'currency', 'balance_before', 'balance_after', 'created_at')

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'idempotency_key', 'from_account', 'to_account', 'amount', 'colored_status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('id', 'idempotency_key', 'description', 'from_account__id', 'to_account__id')
    readonly_fields = ('id', 'created_at')
    inlines = [LedgerEntryInline]

    @admin.display(description='Status')
    def colored_status(self, obj):
        colors = {
            'pending': '#d97706',    # Amber
            'completed': '#16a34a',  # Green
            'failed': '#dc2626',     # Red
            'reversed': '#4b5563',   # Gray
        }
        color = colors.get(obj.status, '#000000')
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_status_display())


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_link', 'account', 'direction_badge', 'formatted_amount', 'balance_after', 'created_at')
    list_filter = ('direction', 'currency', 'created_at')
    search_fields = ('id', 'transaction__id', 'account__id', 'account__user__username')
    readonly_fields = ('id', 'transaction', 'account', 'direction', 'amount', 'currency', 'balance_before', 'balance_after', 'created_at')

    # Prevent accidental admin edits or deletions to uphold the append-only rule
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Transaction')
    def transaction_link(self, obj):
        return format_html('<a href="/admin/yourapp/transaction/{}/change/">{}</a>', obj.transaction.id, str(obj.transaction.id)[:8])

    @admin.display(description='Direction')
    def direction_badge(self, obj):
        color = '#16a34a' if obj.direction == 'credit' else '#dc2626'
        return format_html('<strong style="color: {};">{}</strong>', color, obj.direction.upper())

    @admin.display(description='Amount')
    def formatted_amount(self, obj):
        prefix = '+' if obj.direction == 'credit' else '-'
        return f"{prefix}{obj.currency} {obj.amount:,.2f}"