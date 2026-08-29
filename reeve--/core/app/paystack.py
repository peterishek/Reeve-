"""
Thin wrapper around the Paystack endpoints this app actually uses.

Coverage note: Paystack's resolve/transfer endpoints only cover Nigerian
banks (plus a handful of other African markets it has expanded into) —
there is no cross-border/SWIFT verification here. That's exactly why
`international_transfer` in services.py stays unverified free-text: it's
the correct fallback for a corridor Paystack genuinely doesn't serve, not
a shortcut that was skipped.
"""
import requests
from django.conf import settings

PAYSTACK_BASE = "https://api.paystack.co"


def _headers():
    return {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}


def list_banks(country="nigeria"):
    """Pull the current bank list — call this periodically (e.g. a management
    command run daily/weekly) to sync into the Bank table, not on every request."""
    res = requests.get(f"{PAYSTACK_BASE}/bank", params={"country": country}, headers=_headers())
    res.raise_for_status()
    return res.json()["data"]


def resolve_account(account_number, bank_code):
    """
    Returns {"account_number": ..., "account_name": ...} — the REAL name
    on file at the bank for this account number. This is what makes a
    beneficiary "verified": the account_name shown to the user for
    confirmation comes from here, never typed by them.
    Raises requests.HTTPError if the account/bank combination is invalid.
    """
    res = requests.get(
        f"{PAYSTACK_BASE}/bank/resolve",
        params={"account_number": account_number, "bank_code": bank_code},
        headers=_headers(),
    )
    res.raise_for_status()
    return res.json()["data"]


def create_transfer_recipient(name, account_number, bank_code, currency="NGN"):
    """
    Must be called once before Paystack will let you actually send money
    to this beneficiary. Returns the recipient_code to store on
    UserBankAccount.paystack_recipient_code.
    """
    res = requests.post(
        f"{PAYSTACK_BASE}/transferrecipient",
        json={
            "type": "nuban",
            "name": name,
            "account_number": account_number,
            "bank_code": bank_code,
            "currency": currency,
        },
        headers=_headers(),
    )
    res.raise_for_status()
    return res.json()["data"]["recipient_code"]
