import React, { useState } from "react";
import {
  ArrowRight, ChevronRight, Check, Shield, Lock, TrendingUp,
  User, Building2, Send, PiggyBank,
} from "lucide-react";
import { c } from "../theme";
import BankCard from "../components/BankCard";
import SectionArt from "../components/SectionArt";

function ImageFeatureSection({ id, eyebrow, title, body, bullets, art, image, reverse, cta, setView }) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
      <div className={`rounded-2xl overflow-hidden aspect-[4/3] ${reverse ? "md:order-2" : ""}`}>
        <SectionArt variant={art} image={image} className="w-full h-full" />
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        <div className="f-body text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: c.cobalt }}>{eyebrow}</div>
        <h3 className="f-display text-3xl" style={{ color: c.ink }}>{title}</h3>
        <p className="f-body text-sm mt-3 leading-relaxed max-w-md" style={{ color: c.slate }}>{body}</p>
        <ul className="mt-5 space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-2 f-body text-sm" style={{ color: c.ink }}>
              <Check className="w-4 h-4" style={{ color: c.emerald }} /> {b}
            </li>
          ))}
        </ul>
        <button onClick={() => setView("signup")} className="mt-6 f-body text-sm font-semibold px-5 py-2.5 rounded-full inline-flex items-center gap-1.5" style={{ border: `1px solid ${c.ink}`, color: c.ink }}>
          {cta} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}

export default function Landing({ setView }) {
  const [accountType, setAccountType] = useState("personal");

  const personalFeatures = [
    { icon: Send, title: "Instant transfers", body: "Move money between friends and accounts in seconds, not days." },
    { icon: PiggyBank, title: "Round-up saving", body: "Every card purchase rounds up into a savings pot automatically." },
    { icon: TrendingUp, title: "Spending insights", body: "See where money goes, broken down by category, weekly." },
  ];
  const businessFeatures = [
    { icon: Building2, title: "Multi-user access", body: "Add teammates with permissioned access to payments and statements." },
    { icon: Send, title: "Bulk payouts", body: "Pay suppliers and payroll in a single batch, with audit trails." },
    { icon: Shield, title: "Expense controls", body: "Set spend limits per card and get alerted on unusual activity." },
  ];
  const features = accountType === "personal" ? personalFeatures : businessFeatures;

  return (
    <div style={{ background: c.paper }}>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 f-body text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: c.paperDeep, color: c.slate }}>
            FSCS-style protection · est. portfolio bank
          </div>
          <h1 className="f-display text-[42px] md:text-[56px] leading-[1.05] tracking-tight" style={{ color: c.ink }}>
            Banking, <span style={{ fontStyle: "italic", color: c.cobalt }}>plainly</span> done.
          </h1>
          <p className="f-body mt-5 text-[17px] leading-relaxed max-w-md" style={{ color: c.slate }}>
            Reeve pairs the steadiness of a traditional bank with an app that
            actually feels good to use. Personal and business accounts, open
            in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={() => setView("signup")} className="f-body font-semibold px-6 py-3.5 rounded-full text-white flex items-center gap-2" style={{ background: c.ink }}>
              Open an account <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setView("signin")} className="f-body font-semibold px-6 py-3.5 rounded-full border" style={{ borderColor: c.ink, color: c.ink }}>
              Sign in
            </button>
          </div>
        </div>
        <div className="relative h-[320px] md:h-[380px]">
          <BankCard variant="debit" className="absolute left-0 top-4 z-10" />
          <BankCard variant="credit" className="absolute left-16 top-28 z-0 opacity-95" />
        </div>
      </section>

      <section className="border-y" style={{ borderColor: c.paperDeep, background: c.white }}>
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 f-body text-sm" style={{ color: c.slate }}>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: c.cobalt }} /> Deposits protected</div>
          <div className="flex items-center gap-2"><Lock className="w-4 h-4" style={{ color: c.cobalt }} /> 2-factor by default</div>
          <div className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.cobalt }} /> No monthly fee tier</div>
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: c.cobalt }} /> Same-day transfers</div>
        </div>
      </section>

      <section id={accountType} className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center gap-2 mb-10">
          <button
            onClick={() => setAccountType("personal")}
            className="f-body text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2"
            style={{ background: accountType === "personal" ? c.ink : "transparent", color: accountType === "personal" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
          >
            <User className="w-3.5 h-3.5" /> Personal
          </button>
          <button
            onClick={() => setAccountType("business")}
            className="flex-1 f-body text-sm font-semibold px-5 py-2.5 rounded-full flex items-center justify-center gap-2 md:flex-none"
            style={{ background: accountType === "business" ? c.ink : "transparent", color: accountType === "business" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
          >
            <Building2 className="w-3.5 h-3.5" /> Business
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: c.white, border: `1px solid ${c.paperDeep}` }}>
              <f.icon className="w-6 h-6 mb-4" style={{ color: c.cobalt }} />
              <div className="f-display text-lg" style={{ color: c.ink }}>{f.title}</div>
              <p className="f-body text-sm mt-2 leading-relaxed" style={{ color: c.slate }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="cards" className="py-20" style={{ background: c.ink }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-lg mb-12">
            <h2 className="f-display text-white text-3xl md:text-4xl">Two cards. One account.</h2>
            <p className="f-body mt-3" style={{ color: "#B7BDD1" }}>
              Everyday Debit for daily spending, Reserve Credit for building
              history — both controlled from the same app.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="flex flex-col items-start gap-6">
              <BankCard variant="debit" />
              <ul className="f-body text-sm space-y-2" style={{ color: "#D7DAE6" }}>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.emerald }} /> No foreign transaction fees</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.emerald }} /> Freeze instantly from the app</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.emerald }} /> Tap-to-pay and ATM access</li>
              </ul>
            </div>
            <div className="flex flex-col items-start gap-6">
              <BankCard variant="credit" />
              <ul className="f-body text-sm space-y-2" style={{ color: "#D7DAE6" }}>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.gold }} /> Builds credit history over time</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.gold }} /> Adjustable limit, reviewed monthly</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4" style={{ color: c.gold }} /> 1% back on everyday categories</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ImageFeatureSection id="kids" setView={setView} eyebrow="Kids account" title="Money habits, from the start."
        body="A parent-controlled account for ages 6–17, with its own card and spending limits you set from your own app."
        bullets={["Parent approves every top-up", "Spending limits by category", "Savings goals kids can watch grow"]}
        art="kids" cta="Explore kids accounts" />
      <ImageFeatureSection id="corporate" setView={setView} reverse eyebrow="Corporate accounts" title="Built for larger operations."
        body="Dedicated relationship management, multi-entity structuring, and treasury tools for corporates and institutions."
        bullets={["Dedicated relationship manager", "Multi-entity account structuring", "Integrated payroll & bulk FX"]}
        art="corporate" cta="Talk to corporate banking" />
      <ImageFeatureSection id="offshore" setView={setView} eyebrow="Offshore accounts" title="Bank across borders."
        body="Multi-currency offshore accounts for international income, property, and holdings — managed from one app."
        bullets={["Hold and convert 12+ currencies", "International wire routing", "Dedicated offshore documentation team"]}
        art="offshore" cta="Learn about offshore banking" />
      <ImageFeatureSection id="loans" setView={setView} reverse eyebrow="Loans" title="Borrow with a plan, not just a rate."
        body="Home, personal, and business loans with clear repayment schedules shown before you commit to anything."
        bullets={["Fixed and variable rate options", "Early repayment with no penalty", "Decision in principle in 48 hours"]}
        art="loans" cta="Check loan options" />
      <ImageFeatureSection id="wealth" setView={setView} eyebrow="Wealth management" title="Investing, with a human to call."
        body="Managed portfolios or self-directed investing, plus retirement planning built around your actual timeline."
        bullets={["Managed or self-directed portfolios", "Retirement & pension planning", "Private wealth for larger portfolios"]}
        art="wealth" cta="Explore wealth management" />

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="f-display text-3xl md:text-[44px]" style={{ color: c.ink }}>Open an account in about six minutes.</h2>
        <button onClick={() => setView("signup")} className="mt-8 f-body font-semibold px-7 py-3.5 rounded-full text-white inline-flex items-center gap-2" style={{ background: c.cobalt }}>
          Get started <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      <footer className="border-t py-10" style={{ borderColor: c.paperDeep }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 f-body text-xs" style={{ color: c.slate }}>
          <div>© {new Date().getFullYear()} Reeve Bank — a fictional brand, portfolio project only.</div>
          <div className="flex gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a></div>
        </div>
      </footer>
    </div>
  );
}
