import React, { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { getAccounts, downloadStatement } from "../../lib/api";
import { c } from "../../theme";

export default function Statements() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAccounts()
      .then((res) => {
        setAccounts(res);
        if (res.length) {
          setAccountId(res[0].id);
          setCurrency(res[0].currency);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const currentAccount = accounts.find((a) => a.id === accountId);

  async function handleDownload(e) {
    e.preventDefault();
    setDownloading(true);
    setError("");
    try {
      await downloadStatement(accountId, { currency: currency || undefined, from: from || undefined, to: to || undefined });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <h1 className="f-display text-2xl mb-1" style={{ color: c.ink }}>Statements</h1>
      <p className="f-body text-sm mb-6" style={{ color: c.slate }}>Generate a PDF statement, scoped to one account and currency.</p>

      {accounts.length === 0 ? (
        <p className="f-body text-sm" style={{ color: c.slate }}>No accounts to generate a statement for yet.</p>
      ) : (
        <form onSubmit={handleDownload} className="max-w-lg p-5 rounded-2xl" style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}>
          <label className="block mb-4">
            <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>Account</span>
            <select
              value={accountId}
              onChange={(e) => {
                const acc = accounts.find((a) => a.id === e.target.value);
                setAccountId(e.target.value);
                setCurrency(acc?.currency || "");
              }}
              className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
              style={{ borderColor: c.paperDeep }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_type} — {a.currency}</option>
              ))}
            </select>
          </label>

          <label className="block mb-4">
            <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>Currency</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder={currentAccount?.currency || "e.g. USD"}
              className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
              style={{ borderColor: c.paperDeep }}
            />
          </label>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
                style={{ borderColor: c.paperDeep }}
              />
            </label>
            <label className="block">
              <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
                style={{ borderColor: c.paperDeep }}
              />
            </label>
          </div>

          {error && <p className="f-body text-xs mb-3" style={{ color: "#C0392B" }}>{error}</p>}

          <button
            type="submit"
            disabled={downloading}
            className="w-full f-body text-sm font-semibold py-3 rounded-xl text-white flex items-center justify-center gap-2"
            style={{ background: c.ink, opacity: downloading ? 0.6 : 1 }}
          >
            <FileDown className="w-4 h-4" /> {downloading ? "Generating…" : "Download PDF statement"}
          </button>
        </form>
      )}
    </div>
  );
}
