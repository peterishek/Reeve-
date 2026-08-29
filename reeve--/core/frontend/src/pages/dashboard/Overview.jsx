import React, { useEffect, useState } from "react";
import { Send, CreditCard, FileDown, ArrowUpRight, ArrowDownLeft, Globe, ShieldCheck } from "lucide-react";
import { getAccounts, getRecentTransactions } from "../../lib/api";
import { c } from "../../theme";

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left flex-1 min-w-[160px]"
      style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.paper }}>
        <Icon className="w-4 h-4" style={{ color: c.cobalt }} />
      </div>
      <span className="f-body text-sm font-semibold" style={{ color: c.ink }}>{label}</span>
    </button>
  );
}

export default function Overview({ onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAccounts(), getRecentTransactions(6)])
      .then(([accountsRes, activityRes]) => {
        setAccounts(accountsRes);
        setActivity(activityRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="f-body text-sm" style={{ color: c.slate }}>Loading your dashboard…</p>;
  if (error) return <p className="f-body text-sm" style={{ color: "#C0392B" }}>{error}</p>;

  // group balances by currency for the summary strip
  const byCurrency = accounts.reduce((acc, a) => {
    acc[a.currency] = (acc[a.currency] || 0) + Number(a.balance);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="f-display text-2xl mb-1" style={{ color: c.ink }}>Welcome back</h1>
      <p className="f-body text-sm mb-6" style={{ color: c.slate }}>Here's what's happening across your Reeve accounts.</p>

      {/* Total balance summary, grouped by currency */}
      {Object.keys(byCurrency).length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(byCurrency).map(([currency, total]) => (
            <div key={currency} className="rounded-2xl px-6 py-5" style={{ background: c.ink }}>
              <div className="f-body text-[11px] uppercase tracking-widest opacity-60 text-white">Total balance · {currency}</div>
              <div className="f-display text-3xl text-white mt-1">
                {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <QuickAction icon={Send} label="Send money" onClick={() => onNavigate?.("transfer")} />
        <QuickAction icon={CreditCard} label="Request a card" onClick={() => onNavigate?.("cards")} />
        <QuickAction icon={FileDown} label="Download statement" onClick={() => onNavigate?.("statements")} />
      </div>

      {/* Accounts */}
      <h2 className="f-body text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: c.slate }}>Your accounts</h2>
      {accounts.length === 0 ? (
        <p className="f-body text-sm mb-8" style={{ color: c.slate }}>No accounts found for this user yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl p-5" style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}>
              <div className="f-body text-xs uppercase tracking-widest mb-2" style={{ color: c.slate }}>
                {a.account_type} · {a.currency}
              </div>
              <div className="f-display text-2xl" style={{ color: c.ink }}>
                {a.currency} {Number(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="f-body text-[11px] mt-2" style={{ color: c.slate }}>
                Opened {new Date(a.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity — local and international transfers, most recent first */}
      <h2 className="f-body text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: c.slate }}>Recent activity</h2>
      {activity.length === 0 ? (
        <p className="f-body text-sm" style={{ color: c.slate }}>No transfers yet — send your first one from "Send money" above.</p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${c.paperDeep}` }}>
          {activity.map((txn, i) => {
            const type = txn.transfer_type; // "local" | "external" | "international"
            const Icon = type === "local" ? ArrowUpRight : type === "external" ? ShieldCheck : Globe;
            const typeLabel = type === "local" ? "Local" : type === "external" ? "Local bank" : "International";
            return (
              <div
                key={txn.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ background: c.white, borderTop: i === 0 ? "none" : `1px solid ${c.paperDeep}` }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: c.paper }}>
                  <Icon className="w-4 h-4" style={{ color: c.cobalt }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="f-body text-sm font-semibold truncate" style={{ color: c.ink }}>
                    {type === "local"
                      ? (txn.description || "Transfer")
                      : `To ${txn.recipient_account_name || "recipient"}`}
                  </div>
                  <div className="f-body text-[11px]" style={{ color: c.slate }}>
                    {typeLabel} · {new Date(txn.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="f-mono text-sm" style={{ color: c.ink }}>{txn.amount}</div>
                  <div className="f-body text-[10px] uppercase tracking-widest" style={{ color: txn.status === "completed" ? c.emerald : c.slate }}>
                    {txn.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
