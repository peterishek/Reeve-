import React, { useEffect, useState } from "react";
import { getAccounts, getTransactions } from "../../lib/api";
import { c } from "../../theme";

export default function Transactions() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAccounts()
      .then((res) => {
        setAccounts(res);
        if (res.length) setAccountId(res[0].id);
        else setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    getTransactions(accountId)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  const currentAccount = accounts.find((a) => a.id === accountId);

  return (
    <div>
      <h1 className="f-display text-2xl mb-1" style={{ color: c.ink }}>Transactions</h1>
      <p className="f-body text-sm mb-6" style={{ color: c.slate }}>Ledger history for a single account.</p>

      {accounts.length > 0 && (
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="f-body text-sm px-3 py-2.5 rounded-xl border mb-5"
          style={{ borderColor: c.paperDeep }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.account_type} — {a.currency}</option>
          ))}
        </select>
      )}

      {loading ? (
        <p className="f-body text-sm" style={{ color: c.slate }}>Loading…</p>
      ) : error ? (
        <p className="f-body text-sm" style={{ color: "#C0392B" }}>{error}</p>
      ) : entries.length === 0 ? (
        <p className="f-body text-sm" style={{ color: c.slate }}>No transactions on this account yet.</p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.paperDeep}` }}>
          <table className="w-full f-body text-sm">
            <thead>
              <tr style={{ background: c.paper }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: c.slate }}>Date</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: c.slate }}>Direction</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: c.slate }}>Amount</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: c.slate }}>Balance after</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${c.paperDeep}` }}>
                  <td className="px-4 py-3" style={{ color: c.ink }}>{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize" style={{ color: e.direction === "credit" ? c.emerald : c.ink }}>{e.direction}</td>
                  <td className="px-4 py-3 text-right f-mono" style={{ color: c.ink }}>{e.currency} {e.amount}</td>
                  <td className="px-4 py-3 text-right f-mono" style={{ color: c.slate }}>{e.currency} {e.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
