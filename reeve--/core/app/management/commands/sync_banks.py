"""
Run with: python manage.py sync_banks

Pulls the current bank list from Paystack and upserts into the Bank
table. Run this once at setup and periodically after (banks rarely
change) — never call Paystack's /bank endpoint on every request.
"""
from django.core.management.base import BaseCommand
from app.models import Bank
from app import paystack


class Command(BaseCommand):
    help = "Syncs the Bank table from Paystack's bank list."

    def handle(self, *args, **kwargs):
        banks = paystack.list_banks()
        created, updated = 0, 0

        for b in banks:
            _, was_created = Bank.objects.update_or_create(
                code=b['code'],
                defaults={'name': b['name'], 'country': 'NG', 'is_active': b.get('active', True)},
            )
            created += was_created
            updated += not was_created

        self.stdout.write(self.style.SUCCESS(f"Synced {len(banks)} banks ({created} created, {updated} updated)."))
