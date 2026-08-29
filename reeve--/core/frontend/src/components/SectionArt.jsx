import React, { useState } from "react";
import { Baby, Landmark, Globe, Wallet, LineChart, Briefcase, User } from "lucide-react";

const ART = {
  kids: { grad: `linear-gradient(135deg, #3854E6, #7C93FF)`, Icon: Baby, label: "Kids account" },
  corporate: { grad: `linear-gradient(135deg, #12182B, #2A3A6B)`, Icon: Landmark, label: "Corporate" },
  offshore: { grad: `linear-gradient(135deg, #0E3B5C, #2F4FE0)`, Icon: Globe, label: "Offshore" },
  loans: { grad: `linear-gradient(135deg, #3A2F14, #C9A24B)`, Icon: Wallet, label: "Loans" },
  wealth: { grad: `linear-gradient(135deg, #0E5C3C, #1B8A5A)`, Icon: LineChart, label: "Wealth management" },
  business: { grad: `linear-gradient(135deg, #12182B, #5C6478)`, Icon: Briefcase, label: "Business" },
  personal: { grad: `linear-gradient(135deg, #1E37AE, #2F4FE0)`, Icon: User, label: "Personal" },
};

/**
 * Fixed-aspect image slot with a guaranteed-safe fallback.
 * Pass `image` (any URL/dimensions) once you have real photos — object-fit:
 * cover crops it to fill the slot with no stretching, and onError silently
 * falls back to the illustrated gradient if the URL ever fails.
 */
export default function SectionArt({ variant, image, className = "" }) {
  const cfg = ART[variant] || ART.personal;
  const Icon = cfg.Icon;
  const [failed, setFailed] = useState(false);
  const showPhoto = image && !failed;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: cfg.grad }}>
      {showPhoto && (
        <img
          src={image}
          alt={cfg.label}
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      )}
      {!showPhoto && (
        <>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.18)" }} />
          <div className="absolute -right-4 -bottom-16 w-56 h-56 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.14)" }} />
          <div className="absolute left-6 bottom-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.16)" }}>
            <User className="w-4 h-4 text-white opacity-80" />
          </div>
          <div className="absolute left-16 bottom-9 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.14)" }}>
            <User className="w-3.5 h-3.5 text-white opacity-70" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(2px)" }}>
              <Icon className="w-11 h-11 text-white" strokeWidth={1.6} />
            </div>
          </div>
        </>
      )}
      <span className="absolute top-4 left-4 f-body text-[10px] uppercase tracking-widest text-white/80" style={{ textShadow: showPhoto ? "0 1px 3px rgba(0,0,0,0.6)" : "none" }}>
        {cfg.label}
      </span>
    </div>
  );
}
