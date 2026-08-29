"""
Run with: python manage.py audit_ledger

Checks that total debits equal total credits, per currency, across the
entire bank. If they diverge, something bypassed services.transfer()
and wrote an unbalanced entry directly — this is the integrity check
an auditor (or a scheduled cron job) would run.
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum, Q
from app.models import LedgerEntry


class Command(BaseCommand):
    help = "Reconciles total debits vs total credits per currency."

    def handle(self, *args, **kwargs):
        totals = LedgerEntry.objects.values('currency').annotate(
            debits=Sum('amount', filter=Q(direction='debit')),
            credits=Sum('amount', filter=Q(direction='credit')),
        )

        if not totals:
            self.stdout.write("No ledger entries found.")
            return

        for row in totals:
            debits = row['debits'] or 0
            credits = row['credits'] or 0
            ok = debits == credits
            marker = self.style.SUCCESS("OK") if ok else self.style.ERROR("MISMATCH")
            self.stdout.write(
                f"{row['currency']}: debits={debits}  credits={credits}  [{marker}]"
            )
