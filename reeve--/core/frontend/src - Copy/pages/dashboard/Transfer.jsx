import React, { useEffect, useState } from "react";
import { ArrowRight, Landmark, Globe, Check } from "lucide-react";
import { c } from "../../theme";
import { getAccounts, transferFunds, internationalTransfer } from "../../lib/api";

const COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

function genIdempotencyKey() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputStyle = { borderColor: c.paperDeep };
const inputClass = "w-full f-body text-sm px-3.5 py-2.5 rounded-xl border outline-none";

export default function Transfer({ onSent }) {
  const [mode, setMode] = useState("local"); // "local" | "international"
  const [step, setStep] = useState("form"); // "form" | "review" | "done"
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // shared
  const [fromAccountId, setFromAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // local-only
  const [toAccountId, setToAccountId] = useState("");

  // international-only
  const [recipientName, setRecipientName] = useState("");
  const [recipientBankName, setRecipientBankName] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("GB");
  const [recipientSwiftBic, setRecipientSwiftBic] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    getAccounts()
      .then((res) => {
        setAccounts(res);
        if (res.length) setFromAccountId(res[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  function resetForm() {
    setStep("form");
    setResult(null);
    setError("");
    setAmount("");
    setDescription("");
    setToAccountId("");
    setRecipientName("");
    setRecipientBankName("");
    setRecipientAccountNumber("");
    setRecipientSwiftBic("");
    setPurpose("");
  }

  function goToReview(e) {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (mode === "local" && !toAccountId) {
      setError("Enter a recipient account ID.");
      return;
    }
    if (mode === "international" && (!recipientName || !recipientBankName || !recipientAccountNumber)) {
      setError("Fill in the recipient's name, bank, and account number.");
      return;
    }
    setStep("review");
  }

  async function confirmAndSend() {
    setSubmitting(true);
    setError("");
    try {
      let res;
      if (mode === "local") {
        res = await transferFunds({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          description,
          idempotencyKey: genIdempotencyKey(),
        });
      } else {
        res = await internationalTransfer({
          fromAccountId,
          amount: Number(amount),
          description,
          idempotencyKey: genIdempotencyKey(),
          recipientName,
          recipientBankName,
          recipientAccountNumber,
          recipientCountry,
          recipientSwiftBic,
          purpose,
        });
      }
      setResult(res);
      setStep("done");
      onSent?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="f-display text-2xl mb-1" style={{ color: c.ink }}>Send money</h1>
      <p className="f-body text-sm mb-6" style={{ color: c.slate }}>Transfer between your own Reeve accounts, or send internationally.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode("local"); resetForm(); }}
          className="f-body text-sm font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5"
          style={{ background: mode === "local" ? c.ink : c.white, color: mode === "local" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
        >
          <Landmark className="w-3.5 h-3.5" /> Local (Reeve to Reeve)
        </button>
        <button
          onClick={() => { setMode("international"); resetForm(); }}
          className="f-body text-sm font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5"
          style={{ background: mode === "international" ? c.ink : c.white, color: mode === "international" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
        >
          <Globe className="w-3.5 h-3.5" /> International
        </button>
      </div>

      <div className="max-w-lg p-6 rounded-2xl" style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}>
        {step === "form" && (
          <form onSubmit={goToReview}>
            <Field label="From account">
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={inputClass} style={inputStyle}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_type} — {a.currency} (bal. {a.balance})</option>
                ))}
              </select>
            </Field>

            {mode === "local" ? (
              <Field label="Recipient account ID">
                <input value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} placeholder="Paste the recipient's Reeve account ID" className={inputClass} style={inputStyle} />
              </Field>
            ) : (
              <>
                <Field label="Recipient name">
                  <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} style={inputStyle} />
                </Field>
                <Field label="Recipient bank name">
                  <input value={recipientBankName} onChange={(e) => setRecipientBankName(e.target.value)} className={inputClass} style={inputStyle} />
                </Field>
                <Field label="Recipient account / IBAN number">
                  <input value={recipientAccountNumber} onChange={(e) => setRecipientAccountNumber(e.target.value)} className={inputClass} style={inputStyle} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Recipient country">
                    <select value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)} className={inputClass} style={inputStyle}>
                      {COUNTRIES.map((c2) => <option key={c2.code} value={c2.code}>{c2.name}</option>)}
                    </select>
                  </Field>
                  <Field label="SWIFT / BIC (optional)">
                    <input value={recipientSwiftBic} onChange={(e) => setRecipientSwiftBic(e.target.value)} className={inputClass} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Purpose (optional)">
                  <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. family support, invoice payment" className={inputClass} style={inputStyle} />
                </Field>
              </>
            )}

            <Field label={`Amount${fromAccount ? ` (${fromAccount.currency})` : ""}`}>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Description (optional)">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} style={inputStyle} />
            </Field>

            {error && <p className="f-body text-xs mb-3" style={{ color: "#C0392B" }}>{error}</p>}

            <button type="submit" className="w-full f-body text-sm font-semibold py-3 rounded-xl text-white flex items-center justify-center gap-2" style={{ background: c.ink }}>
              Review transfer <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === "review" && (
          <div>
            <h2 className="f-display text-xl mb-4" style={{ color: c.ink }}>Review before sending</h2>
            <dl className="f-body text-sm space-y-2.5 mb-5">
              <Row label="From" value={fromAccount ? `${fromAccount.account_type} — ${fromAccount.currency}` : "—"} />
              {mode === "local" ? (
                <Row label="To account" value={toAccountId} />
              ) : (
                <>
                  <Row label="Recipient" value={recipientName} />
                  <Row label="Bank" value={recipientBankName} />
                  <Row label="Account / IBAN" value={recipientAccountNumber} />
                  <Row label="Country" value={COUNTRIES.find((c2) => c2.code === recipientCountry)?.name} />
                  {recipientSwiftBic && <Row label="SWIFT/BIC" value={recipientSwiftBic} />}
                </>
              )}
              <Row label="Amount" value={`${fromAccount?.currency || ""} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} bold />
              {description && <Row label="Description" value={description} />}
            </dl>

            {mode === "international" && (
              <p className="f-body text-xs mb-4 p-3 rounded-xl" style={{ background: c.paper, color: c.slate }}>
                International transfers settle over 1–3 business days and show as <strong>Pending</strong> until the receiving bank confirms — no exchange rate or fee is applied in this prototype.
              </p>
            )}

            {error && <p className="f-body text-xs mb-3" style={{ color: "#C0392B" }}>{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep("form")} className="flex-1 f-body text-sm font-semibold py-3 rounded-xl" style={{ border: `1px solid ${c.paperDeep}`, color: c.ink }}>
                Back
              </button>
              <button
                onClick={confirmAndSend}
                disabled={submitting}
                className="flex-1 f-body text-sm font-semibold py-3 rounded-xl text-white"
                style={{ background: c.cobalt, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? "Sending…" : "Confirm & send"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: c.emerald + "20" }}>
              <Check className="w-6 h-6" style={{ color: c.emerald }} />
            </div>
            <h2 className="f-display text-xl mb-1" style={{ color: c.ink }}>
              {mode === "local" ? "Transfer complete" : "Transfer submitted"}
            </h2>
            <p className="f-body text-sm mb-1" style={{ color: c.slate }}>
              Status: <span className="capitalize">{result.status}</span>
            </p>
            <p className="f-body text-xs mb-6" style={{ color: c.slate }}>Reference: {result.transaction_id}</p>
            <button onClick={resetForm} className="f-body text-sm font-semibold px-5 py-2.5 rounded-full text-white" style={{ background: c.ink }}>
              Send another transfer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: c.slate }}>{label}</dt>
      <dd style={{ color: c.ink, fontWeight: bold ? 700 : 500 }}>{value}</dd>
    </div>
  );
}
