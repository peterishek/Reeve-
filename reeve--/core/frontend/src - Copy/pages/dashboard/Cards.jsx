import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getCards, getAccounts, requestCard } from "../../lib/api";
import { c } from "../../theme";
import BankCard from "../../components/BankCard";

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [cardType, setCardType] = useState("debit");
  const [creditLimit, setCreditLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function loadAll() {
    setLoading(true);
    Promise.all([getCards(), getAccounts()])
      .then(([cardsRes, accountsRes]) => {
        setCards(cardsRes);
        setAccounts(accountsRes);
        if (accountsRes.length && !accountId) setAccountId(accountsRes[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  async function handleRequestCard(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await requestCard({
        accountId,
        cardType,
        creditLimit: cardType === "credit" && creditLimit ? Number(creditLimit) : undefined,
      });
      setShowForm(false);
      setCreditLimit("");
      loadAll();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="f-body text-sm" style={{ color: c.slate }}>Loading cards…</p>;
  if (error) return <p className="f-body text-sm" style={{ color: "#C0392B" }}>{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="f-display text-2xl mb-1" style={{ color: c.ink }}>Cards</h1>
          <p className="f-body text-sm" style={{ color: c.slate }}>Debit and credit cards issued to your accounts.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="f-body text-sm font-semibold px-4 py-2.5 rounded-full text-white flex items-center gap-1.5"
          style={{ background: c.ink }}
        >
          <Plus className="w-4 h-4" /> Request card
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleRequestCard} className="mb-8 p-5 rounded-2xl" style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <label className="block">
              <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>Account</span>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
                style={{ borderColor: c.paperDeep }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_type} — {a.currency}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>Card type</span>
              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
                style={{ borderColor: c.paperDeep }}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </label>
            {cardType === "credit" && (
              <label className="block">
                <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>Requested limit</span>
                <input
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full f-body text-sm px-3 py-2.5 rounded-xl border mt-1.5"
                  style={{ borderColor: c.paperDeep }}
                  placeholder="e.g. 5000"
                />
              </label>
            )}
          </div>
          {formError && <p className="f-body text-xs mt-3" style={{ color: "#C0392B" }}>{formError}</p>}
          <button
            type="submit"
            disabled={submitting || !accountId}
            className="mt-4 f-body text-sm font-semibold px-5 py-2.5 rounded-full text-white"
            style={{ background: c.cobalt, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </form>
      )}

      {cards.length === 0 ? (
        <p className="f-body text-sm" style={{ color: c.slate }}>No cards issued yet — request one above.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-8">
          {cards.map((card) => (
            <BankCard key={card.id} variant={card.card_type} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
