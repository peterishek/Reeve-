import React, { useState } from "react";
import { Wifi } from "lucide-react";
import { c } from "../theme";

/**
 * Realistic bank card (front + back, flippable).
 *
 * `card` (optional) — real data from the backend: { last_four, expiry_month,
 * expiry_year, status }. Falls back to demo numbers when not provided, so
 * this still works standalone on the landing/auth pages.
 * `holderName` (optional) — defaults to a placeholder.
 * `image` (optional) — real card-texture photo, any dimensions; object-fit
 * cover keeps the card's fixed aspect-ratio shape no matter what's passed in.
 */
export default function BankCard({ variant = "debit", className = "", image, card, holderName }) {
  const [flipped, setFlipped] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const isCredit = variant === "credit";
  const bg = isCredit
    ? `linear-gradient(150deg, #1B1F2B 0%, #2A2E3C 45%, #4A3D22 100%)`
    : `linear-gradient(150deg, ${c.ink} 0%, ${c.cobaltDeep} 55%, ${c.cobalt} 100%)`;
  const accent = isCredit ? c.gold : "#8FA3FF";

  const lastFour = card?.last_four || (isCredit ? "4471" : "0192");
  const number = `••••  ••••  ••••  ${lastFour}`;
  const expiry = card
    ? `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`
    : "09/29";
  const name = holderName || "CARDHOLDER";
  const showPhoto = image && !imgFailed;
  const isFrozen = card?.status === "frozen";

  return (
    <div className={`card-flip-wrap w-full max-w-[360px] ${className}`}>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="relative w-full aspect-[1.586/1] block text-left"
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label="Flip card"
      >
        <div className={`card-flip-inner relative w-full h-full ${flipped ? "is-flipped" : ""}`}>
          {/* FRONT */}
          <div
            className="card-face absolute inset-0 rounded-[18px] p-6 flex flex-col justify-between shadow-2xl overflow-hidden"
            style={{ background: bg, boxShadow: "0 30px 60px -20px rgba(18,24,43,0.5)", filter: isFrozen ? "grayscale(0.7)" : "none" }}
          >
            {showPhoto && (
              <img
                src={image}
                alt=""
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: "cover", objectPosition: "center", opacity: 0.55 }}
              />
            )}
            <div className="absolute inset-0 opacity-[0.08]" style={{ background: "radial-gradient(circle at 80% 0%, white, transparent 55%)" }} />
            <div className="flex items-start justify-between relative">
              <div>
                <div className="f-display text-white text-[16px] tracking-wide">Reeve</div>
                <div className="f-body text-[9.5px] uppercase tracking-[0.18em] mt-0.5" style={{ color: accent }}>
                  {isCredit ? "Reserve Credit" : "Everyday Debit"}
                </div>
              </div>
              <Wifi className="w-5 h-5 rotate-90 opacity-70" style={{ color: accent }} />
            </div>

            <div className="relative flex items-center gap-3">
              <div className="w-10 h-8 rounded-[5px] relative overflow-hidden" style={{ background: `linear-gradient(135deg, #F3DFA2, ${accent})` }}>
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[1px] p-[2px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border" style={{ borderColor: "rgba(0,0,0,0.25)" }} />
                  ))}
                </div>
              </div>
              <div
                className="w-7 h-7 rounded-full opacity-80"
                style={{ background: "conic-gradient(from 90deg, #fff, #cfd8ff, #fff, #cfd8ff, #fff)" }}
                title="hologram"
              />
            </div>

            <div className="relative">
              <div className="f-mono text-white text-[16px] tracking-[0.14em]" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.15)" }}>
                {number}
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <div className="f-body text-[8.5px] uppercase tracking-widest opacity-60 text-white">Cardholder / Valid thru</div>
                  <div className="f-body text-white text-[12px] mt-0.5">{name} &nbsp; {expiry}</div>
                </div>
                <div className="flex items-center -space-x-2">
                  <div className="w-6 h-6 rounded-full opacity-90" style={{ background: accent }} />
                  <div className="w-6 h-6 rounded-full opacity-70" style={{ background: "white" }} />
                </div>
              </div>
            </div>
            {isFrozen && (
              <div className="absolute top-3 right-3 f-body text-[9px] uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)", color: "white" }}>
                Frozen
              </div>
            )}
          </div>

          {/* BACK */}
          <div
            className="card-face back absolute inset-0 rounded-[18px] shadow-2xl overflow-hidden"
            style={{ background: bg, boxShadow: "0 30px 60px -20px rgba(18,24,43,0.5)" }}
          >
            <div className="w-full h-9 mt-5" style={{ background: "#0B0E17" }} />
            <div className="px-6 mt-5">
              <div className="h-8 rounded-[3px] flex items-center justify-end px-3" style={{ background: "#E8E6DE" }}>
                <span className="f-mono text-[11px] italic" style={{ color: c.ink }}>signature — do not use</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="f-body text-[8.5px] uppercase tracking-widest opacity-60 text-white">CVV</span>
                <span className="f-mono text-white text-[13px]">•••</span>
              </div>
              <p className="f-body text-[8px] leading-relaxed mt-6 opacity-50 text-white max-w-[220px]">
                This card is property of Reeve Bank (fictional). If found,
                report to any Reeve branch. Portfolio demo — not a real
                financial instrument.
              </p>
            </div>
          </div>
        </div>
      </button>
      <p className="f-body text-[10px] mt-2 opacity-50" style={{ color: c.slate }}>Tap card to flip</p>
    </div>
  );
}
