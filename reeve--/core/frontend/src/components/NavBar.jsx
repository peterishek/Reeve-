import React, { useState } from "react";
import {
  ArrowRight, ChevronDown, Menu, X, MapPin, Globe, Phone,
  User, Building2, Landmark, Wallet, LineChart, Baby, PiggyBank, Send, TrendingUp, Shield, Briefcase
} from "lucide-react";
import { c } from "../theme";
import SectionArt from "./SectionArt";

export const MENU = {
  Personal: {
    icon: User,
    art: "personal",
    blurb: "Everyday banking for you and your family.",
    links: [
      { icon: Wallet, label: "Everyday account", sub: "No monthly fee, instant transfers" },
      { icon: Baby, label: "Kids account", sub: "Parent-controlled, ages 6–17" },
      { icon: PiggyBank, label: "Savings", sub: "Round-ups and fixed terms" },
    ],
  },
  Business: {
    icon: Building2,
    art: "business",
    blurb: "Tools for sole traders and growing teams.",
    links: [
      { icon: Building2, label: "Business current account", sub: "Multi-user access" },
      { icon: Send, label: "Payments & payroll", sub: "Bulk payouts, audit trail" },
      { icon: TrendingUp, label: "Merchant services", sub: "Card payments in-store & online" },
    ],
  },
  Corporate: {
    icon: Landmark,
    art: "corporate",
    blurb: "Treasury and lending for larger enterprises.",
    links: [
      { icon: Landmark, label: "Corporate accounts", sub: "Dedicated relationship manager" },
      { icon: Globe, label: "Offshore accounts", sub: "Multi-currency, international" },
      { icon: Send, label: "Trade finance", sub: "Letters of credit, guarantees" },
    ],
  },
  Loans: {
    icon: Wallet,
    art: "loans",
    blurb: "Borrowing for homes, cars, and life plans.",
    links: [
      { icon: Landmark, label: "Home loans", sub: "Fixed and variable rates" },
      { icon: Wallet, label: "Personal loans", sub: "From £1,000 to £25,000" },
      { icon: Briefcase, label: "Business loans", sub: "Working capital & expansion" },
    ],
  },
  Wealth: {
    icon: LineChart,
    art: "wealth",
    blurb: "Investing and planning for the long run.",
    links: [
      { icon: LineChart, label: "Investment accounts", sub: "Managed or self-directed" },
      { icon: Landmark, label: "Retirement planning", sub: "Pensions & long-term goals" },
      { icon: Shield, label: "Private wealth", sub: "For high-net-worth clients" },
    ],
  },
};

function MegaMenu({ setView }) {
  const [openKey, setOpenKey] = useState(null);
  return (
    <div className="hidden md:flex items-center gap-1 relative">
      {Object.entries(MENU).map(([key, m]) => (
        <div key={key} onMouseEnter={() => setOpenKey(key)} onMouseLeave={() => setOpenKey(null)}>
          <button className="f-body text-sm font-semibold px-3.5 py-2 rounded-full flex items-center gap-1" style={{ color: c.ink }}>
            {key} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
          {openKey === key && (
            <div
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-[1.1fr_1fr]"
              style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}
            >
              <div className="p-6">
                <div className="f-body text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: c.slate }}>{key}</div>
                <div className="flex flex-col gap-1">
                  {m.links.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => setView("signup")}
                      className="flex items-start gap-3 p-3 rounded-xl text-left"
                      onMouseOver={(e) => (e.currentTarget.style.background = c.paper)}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <l.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c.cobalt }} />
                      <div>
                        <div className="f-body text-sm font-semibold" style={{ color: c.ink }}>{l.label}</div>
                        <div className="f-body text-xs mt-0.5" style={{ color: c.slate }}>{l.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[180px]">
                <SectionArt variant={m.art} className="absolute inset-0" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(18,24,43,0) 40%, rgba(18,24,43,0.85) 100%)" }} />
                <p className="absolute bottom-4 left-4 right-4 f-body text-white text-sm">{m.blurb}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function NavBar({ setView }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(240,238,230,0.9)" }}>
      <div className="hidden md:block" style={{ background: c.ink }}>
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center justify-between f-body text-[11px]" style={{ color: "#AEB4C8" }}>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Find a branch</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> 0800 555 0192</span>
          </div>
          <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> English (UK)</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => setView("landing")} className="f-display text-2xl tracking-tight" style={{ color: c.ink }}>Reeve</button>
        <MegaMenu setView={setView} />
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => setView("signin")} className="f-body text-sm font-semibold px-4 py-2" style={{ color: c.ink }}>Sign in</button>
          <button onClick={() => setView("signup")} className="f-body text-sm font-semibold px-5 py-2.5 rounded-full text-white flex items-center gap-1.5" style={{ background: c.ink }}>
            Open an account <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-3 f-body text-sm" style={{ color: c.ink }}>
          {Object.keys(MENU).map((k) => <a key={k} href={`#${k.toLowerCase()}`}>{k}</a>)}
          <button onClick={() => setView("signin")} className="text-left font-semibold">Sign in</button>
          <button onClick={() => setView("signup")} className="text-left font-semibold">Open an account</button>
        </div>
      )}
    </header>
  );
}
