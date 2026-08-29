// Talks to the Django backend built earlier.
//
// SECURITY NOTE: this stores the JWT in localStorage, which is the pragmatic
// choice for a plain React (Vite) app since there's no server layer to hold
// it in an httpOnly cookie the way the Next.js proxy pattern discussed
// earlier would. Fine for a prototype; if this becomes a real product,
// that's specifically the point where moving to Next.js (with an
// app/api/... route proxying requests) is worth the extra complexity.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("reeve_access_token");
}

export function setToken(token) {
  localStorage.setItem("reeve_access_token", token);
}

export function clearToken() {
  localStorage.removeItem("reeve_access_token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail;
    try {
      detail = await res.json();
    } catch {
      detail = { error: res.statusText };
    }
    throw new Error(detail.error || detail.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ---------- Auth ----------
// NOTE: there's no registration endpoint built on the backend yet — SignUp
// is still UI-only. For now, create a test user via `python manage.py
// createsuperuser` (or Django admin) and sign in with those credentials.
//
// `identifier` can be either the account's username OR its email — the
// backend's EmailOrUsernameTokenObtainPairSerializer looks up whichever
// matches before authenticating. The request body key stays "username"
// because that's the field name simplejwt's token endpoint expects; only
// what's allowed to go IN that field has changed.
export function login(identifier, password) {
  return apiFetch("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username: identifier, password }),
  });
}

// ---------- Accounts ----------
export function getAccounts() {
  return apiFetch("/api/accounts/");
}

export function getAccount(accountId) {
  return apiFetch(`/api/accounts/${accountId}/`);
}

// ---------- Cards ----------
export function getCards() {
  return apiFetch("/api/cards/");
}

export function requestCard({ accountId, cardType, creditLimit }) {
  return apiFetch("/api/cards/request/", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      card_type: cardType,
      ...(creditLimit ? { credit_limit: creditLimit } : {}),
    }),
  });
}

// ---------- Transactions ----------
export function getTransactions(accountId, currency) {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return apiFetch(`/api/accounts/${accountId}/transactions/${qs}`);
}

export function transferFunds({ fromAccountId, toAccountId, amount, description, idempotencyKey }) {
  return apiFetch("/api/transfer/", {
    method: "POST",
    body: JSON.stringify({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      description,
      idempotency_key: idempotencyKey,
    }),
  });
}

export function internationalTransfer({
  fromAccountId, amount, description, idempotencyKey,
  recipientName, recipientBankName, recipientAccountNumber,
  recipientCountry, recipientSwiftBic, purpose,
}) {
  return apiFetch("/api/transfer/international/", {
    method: "POST",
    body: JSON.stringify({
      from_account_id: fromAccountId,
      amount,
      description,
      idempotency_key: idempotencyKey,
      recipient_name: recipientName,
      recipient_bank_name: recipientBankName,
      recipient_account_number: recipientAccountNumber,
      recipient_country: recipientCountry,
      recipient_swift_bic: recipientSwiftBic || "",
      purpose: purpose || "",
    }),
  });
}

export function getRecentTransactions(limit = 10) {
  return apiFetch(`/api/transactions/recent/?limit=${limit}`);
}

// ---------- Statements ----------
// PDF download — returns a Blob rather than JSON, so it bypasses apiFetch.
export async function downloadStatement(accountId, { currency, from, to } = {}) {
  const token = getToken();
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(`${API_URL}/api/accounts/${accountId}/statement/?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Statement request failed (${res.status})`);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reeve-statement-${accountId}${currency ? `-${currency}` : ""}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
