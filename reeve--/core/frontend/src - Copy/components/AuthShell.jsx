import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { c } from "../theme";
import BankCard from "./BankCard";

export function AuthShell({ children, setView, quote }) {
  return (
    <div className="min-h-[640px] grid md:grid-cols-2" style={{ background: c.paper }}>
      <div className="hidden md:flex flex-col justify-between p-12" style={{ background: c.ink }}>
        <button onClick={() => setView("landing")} className="f-display text-2xl text-white">Reeve</button>
        <div>
          <p className="f-display text-white text-2xl leading-snug italic max-w-xs">"{quote}"</p>
          <div className="mt-8"><BankCard variant="debit" className="max-w-[280px]" /></div>
        </div>
        <div className="f-body text-xs" style={{ color: "#8790A8" }}>© {new Date().getFullYear()} Reeve Bank</div>
      </div>
      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, show, toggleShow }) {
  return (
    <label className="block mb-4">
      <span className="f-body text-xs font-semibold uppercase tracking-wide" style={{ color: c.slate }}>{label}</span>
      <div className="relative mt-1.5">
        <input
          type={type === "password" && show ? "text" : type}
          value={value}
          onChange={onChange}
          className="w-full f-body text-sm px-4 py-3 rounded-xl outline-none border focus:ring-2"
          style={{ borderColor: c.paperDeep, background: c.white, color: c.ink }}
        />
        {type === "password" && (
          <button type="button" onClick={toggleShow} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.slate }}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </label>
  );
}
