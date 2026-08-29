import React, { useEffect, useState } from "react";
import { ArrowRight, Landmark, Globe, ShieldCheck, Check, Plus } from "lucide-react";
import { c } from "../../theme";
import {
  getAccounts, transferFunds, internationalTransfer, lookupAccount,
  getBanks, getBeneficiaries, resolveAccount, saveBeneficiary, externalTransfer,
} from "../../lib/api";

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

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: c.slate }}>{label}</dt>
      <dd style={{ color: c.ink, fontWeight: bold ? 700 : 500 }}>{value}</dd>
    </div>
  );
}

export default function Transfer({ onSent }) {
  const [mode, setMode] = useState("local"); // "local" | "external" | "international"
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
  const [localRecipient, setLocalRecipient] = useState(null); // { account_type, currency, owner_name }
  const [localVerifying, setLocalVerifying] = useState(false);

  // external-only (Paystack-verified)
  const [banks, setBanks] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [addingNew, setAddingNew] = useState(false);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
  const [newBankId, setNewBankId] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);

  // international-only
  const [recipientAccountName, setRecipientAccountName] = useState("");
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

  useEffect(() => {
    if (mode !== "external") return;
    Promise.all([getBanks(), getBeneficiaries()])
      .then(([banksRes, beneficiariesRes]) => {
        setBanks(banksRes);
        setBeneficiaries(beneficiariesRes);
        if (beneficiariesRes.length) setSelectedBeneficiaryId(beneficiariesRes[0].id);
        else setAddingNew(true);
      })
      .catch((e) => setError(e.message));
  }, [mode]);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const selectedBeneficiary = beneficiaries.find((b) => b.id === Number(selectedBeneficiaryId));

  function resetForm() {
    setStep("form");
    setResult(null);
    setError("");
    setAmount("");
    setDescription("");
    setToAccountId("");
    setLocalRecipient(null);
    setAddingNew(false);
    setNewBankId("");
    setNewAccountNumber("");
    setResolvedName("");
    setRecipientAccountName("");
    setRecipientBankName("");
    setRecipientAccountNumber("");
    setRecipientSwiftBic("");
    setPurpose("");
  }

  async function handleVerifyLocal(e) {
    e.preventDefault();
    setError("");
    setLocalVerifying(true);
    setLocalRecipient(null);
    try {
      const res = await lookupAccount(toAccountId);
      setLocalRecipient(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLocalVerifying(false);
    }
  }

  async function handleResolve(e) {
    e.preventDefault();
    setError("");
    setResolving(true);
    setResolvedName("");
    try {
      const bank = banks.find((b) => b.id === Number(newBankId));
      const res = await resolveAccount({ accountNumber: newAccountNumber, bankCode: bank.code });
      setResolvedName(res.account_name);
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  }

  async function handleSaveBeneficiary() {
    setSavingBeneficiary(true);
    setError("");
    try {
      const saved = await saveBeneficiary({ bankId: Number(newBankId), accountNumber: newAccountNumber, accountName: resolvedName });
      setBeneficiaries((prev) => [saved, ...prev]);
      setSelectedBeneficiaryId(saved.id);
      setAddingNew(false);
      setNewBankId("");
      setNewAccountNumber("");
      setResolvedName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBeneficiary(false);
    }
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
    if (mode === "local" && !localRecipient) {
      setError("Verify the recipient account first.");
      return;
    }
    if (mode === "external" && !selectedBeneficiaryId) {
      setError("Select or add a verified beneficiary first.");
      return;
    }
    if (mode === "international" && (!recipientAccountName || !recipientBankName || !recipientAccountNumber)) {
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
          fromAccountId, toAccountId, amount: Number(amount), description,
          idempotencyKey: genIdempotencyKey(),
        });
      } else if (mode === "external") {
        res = await externalTransfer({
          fromAccountId, beneficiaryId: Number(selectedBeneficiaryId), amount: Number(amount), description,
          idempotencyKey: genIdempotencyKey(),
        });
      } else {
        res = await internationalTransfer({
          fromAccountId, amount: Number(amount), description,
          idempotencyKey: genIdempotencyKey(),
          recipientAccountName, recipientBankName, recipientAccountNumber,
          recipientCountry, recipientSwiftBic, purpose,
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
      <p className="f-body text-sm mb-6" style={{ color: c.slate }}>Between your own Reeve accounts, to a verified local bank, or internationally.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "local", label: "Local (Reeve to Reeve)", icon: Landmark },
          { key: "external", label: "Local bank (verified)", icon: ShieldCheck },
          { key: "international", label: "International", icon: Globe },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); resetForm(); }}
            className="f-body text-sm font-semibold px-4 py-2.5 rounded-full flex items-center gap-1.5"
            style={{ background: mode === m.key ? c.ink : c.white, color: mode === m.key ? c.white : c.ink, border: `1px solid ${c.ink}` }}
          >
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
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

            {mode === "local" && (
              <div className="mb-4">
                <Field label="Recipient account ID">
                  <input
                    value={toAccountId}
                    onChange={(e) => { setToAccountId(e.target.value); setLocalRecipient(null); }}
                    placeholder="Paste the recipient's Reeve account ID"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                {!localRecipient ? (
                  <button
                    type="button"
                    onClick={handleVerifyLocal}
                    disabled={localVerifying || !toAccountId}
                    className="f-body text-sm font-semibold px-4 py-2 rounded-full text-white"
                    style={{ background: c.cobalt, opacity: localVerifying ? 0.6 : 1 }}
                  >
                    {localVerifying ? "Checking…" : "Verify recipient"}
                  </button>
                ) : (
                  <div className="p-3 rounded-lg" style={{ background: c.paper, border: `1px solid ${c.emerald}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4" style={{ color: c.emerald }} />
                      <span className="f-body text-xs font-semibold" style={{ color: c.emerald }}>Found in Reeve</span>
                    </div>
                    <p className="f-body text-sm" style={{ color: c.ink }}>{localRecipient.owner_name}</p>
                    <p className="f-body text-xs" style={{ color: c.slate }}>{localRecipient.account_type} · {localRecipient.currency}</p>
                  </div>
                )}
              </div>
            )}

            {mode === "external" && (
              <div className="mb-4">
                {!addingNew ? (
                  <>
                    <Field label="Beneficiary">
                      <select value={selectedBeneficiaryId} onChange={(e) => setSelectedBeneficiaryId(e.target.value)} className={inputClass} style={inputStyle}>
                        {beneficiaries.map((b) => (
                          <option key={b.id} value={b.id}>{b.account_name} — {b.bank?.name} •••{b.account_number.slice(-4)}</option>
                        ))}
                      </select>
                    </Field>
                    <button type="button" onClick={() => setAddingNew(true)} className="f-body text-xs font-semibold flex items-center gap-1" style={{ color: c.cobalt }}>
                      <Plus className="w-3.5 h-3.5" /> Add a new beneficiary
                    </button>
                  </>
                ) : (
                  <div className="p-4 rounded-xl mb-2" style={{ background: c.paper }}>
                    <Field label="Bank">
                      <select value={newBankId} onChange={(e) => { setNewBankId(e.target.value); setResolvedName(""); }} className={inputClass} style={inputStyle}>
                        <option value="">Select a bank</option>
                        {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Account number">
                      <input value={newAccountNumber} onChange={(e) => { setNewAccountNumber(e.target.value); setResolvedName(""); }} className={inputClass} style={inputStyle} />
                    </Field>

                    {!resolvedName ? (
                      <button
                        type="button"
                        onClick={handleResolve}
                        disabled={resolving || !newBankId || !newAccountNumber}
                        className="f-body text-sm font-semibold px-4 py-2 rounded-full text-white"
                        style={{ background: c.cobalt, opacity: resolving ? 0.6 : 1 }}
                      >
                        {resolving ? "Verifying…" : "Verify account"}
                      </button>
                    ) : (
                      <div className="p-3 rounded-lg mb-3" style={{ background: c.white, border: `1px solid ${c.emerald}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-4 h-4" style={{ color: c.emerald }} />
                          <span className="f-body text-xs font-semibold" style={{ color: c.emerald }}>Verified</span>
                        </div>
                        <p className="f-body text-sm" style={{ color: c.ink }}>{resolvedName}</p>
                        <button
                          type="button"
                          onClick={handleSaveBeneficiary}
                          disabled={savingBeneficiary}
                          className="mt-3 f-body text-xs font-semibold px-4 py-2 rounded-full text-white"
                          style={{ background: c.ink, opacity: savingBeneficiary ? 0.6 : 1 }}
                        >
                          {savingBeneficiary ? "Saving…" : "Save beneficiary"}
                        </button>
                      </div>
                    )}

                    {beneficiaries.length > 0 && (
                      <button type="button" onClick={() => setAddingNew(false)} className="f-body text-xs font-semibold block mt-2" style={{ color: c.slate }}>
                        Cancel — use an existing beneficiary instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === "international" && (
              <>
                <Field label="Recipient account name">
                  <input value={recipientAccountName} onChange={(e) => setRecipientAccountName(e.target.value)} className={inputClass} style={inputStyle} />
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
              {mode === "local" && (
                <>
                  <Row label="To" value={localRecipient?.owner_name || toAccountId} />
                  <Row label="Account" value={`${localRecipient?.account_type || ""} · ${localRecipient?.currency || ""}`} />
                </>
              )}
              {mode === "external" && selectedBeneficiary && (
                <>
                  <Row label="Beneficiary" value={selectedBeneficiary.account_name} />
                  <Row label="Bank" value={selectedBeneficiary.bank?.name} />
                  <Row label="Account" value={`•••${selectedBeneficiary.account_number.slice(-4)}`} />
                </>
              )}
              {mode === "international" && (
                <>
                  <Row label="Recipient" value={recipientAccountName} />
                  <Row label="Bank" value={recipientBankName} />
                  <Row label="Account / IBAN" value={recipientAccountNumber} />
                  <Row label="Country" value={COUNTRIES.find((c2) => c2.code === recipientCountry)?.name} />
                  {recipientSwiftBic && <Row label="SWIFT/BIC" value={recipientSwiftBic} />}
                </>
              )}
              <Row label="Amount" value={`${fromAccount?.currency || ""} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} bold />
              {description && <Row label="Description" value={description} />}
            </dl>

            {mode !== "local" && (
              <p className="f-body text-xs mb-4 p-3 rounded-xl" style={{ background: c.paper, color: c.slate }}>
                {mode === "external"
                  ? "This beneficiary's name was verified against their bank before saving — the transfer shows as Pending until it settles."
                  : "International transfers settle over 1–3 business days and show as Pending — no exchange rate or fee is applied in this prototype."}
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
