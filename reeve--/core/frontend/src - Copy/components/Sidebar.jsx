import React from "react";
import { LayoutGrid, CreditCard, ArrowLeftRight, Send, FileText, Landmark, LineChart, Baby, LogOut } from "lucide-react";
import { c } from "../theme";

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutGrid, ready: true },
  { key: "transfer", label: "Send money", icon: Send, ready: true },
  { key: "cards", label: "Cards", icon: CreditCard, ready: true },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight, ready: true },
  { key: "statements", label: "Statements", icon: FileText, ready: true },
  { key: "loans", label: "Loans", icon: Landmark, ready: false },
  { key: "wealth", label: "Wealth", icon: LineChart, ready: false },
  { key: "kids", label: "Kids accounts", icon: Baby, ready: false },
];

export default function Sidebar({ active, onNavigate, onSignOut }) {
  return (
    <aside className="w-full md:w-64 shrink-0 flex md:flex-col md:min-h-screen p-4 md:p-6" style={{ background: c.ink }}>
      <div className="f-display text-2xl text-white mb-8 hidden md:block">Reeve</div>
      <nav className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible">
        {NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              disabled={!item.ready}
              onClick={() => item.ready && onNavigate(item.key)}
              className="f-body text-sm font-medium flex items-center gap-3 px-3 py-2.5 rounded-xl whitespace-nowrap transition-colors"
              style={{
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                color: item.ready ? "white" : "#5C6478",
                cursor: item.ready ? "pointer" : "not-allowed",
              }}
              title={item.ready ? undefined : "Coming soon"}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {!item.ready && <span className="hidden md:inline text-[9px] uppercase ml-auto opacity-60">Soon</span>}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onSignOut}
        className="f-body text-sm font-medium flex items-center gap-3 px-3 py-2.5 rounded-xl mt-4 md:mt-0"
        style={{ color: "#AEB4C8" }}
      >
        <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Sign out</span>
      </button>
    </aside>
  );
}
