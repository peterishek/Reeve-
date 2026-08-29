import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Overview from "./Overview";
import Transfer from "./Transfer";
import Cards from "./Cards";
import Transactions from "./Transactions";
import Statements from "./Statements";
import { clearToken } from "../../lib/api";

/**
 * In this Vite version, "pages" here are just conditional renders driven
 * by useState — no real URL routing. Porting to Next.js later, each of
 * these becomes its own file: app/dashboard/page.jsx (Overview),
 * app/dashboard/transfer/page.jsx, app/dashboard/cards/page.jsx,
 * app/dashboard/transactions/page.jsx, app/dashboard/statements/page.jsx
 * — and Sidebar's onNavigate becomes next/link hrefs instead of setState.
 */
export default function DashboardLayout({ onSignOut }) {
  const [active, setActive] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSignOut() {
    clearToken();
    onSignOut();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar active={active} onNavigate={setActive} onSignOut={handleSignOut} />
      <main className="flex-1 p-6 md:p-10" style={{ background: "#FAFAF7" }}>
        {active === "overview" && <Overview key={refreshKey} onNavigate={setActive} />}
        {active === "transfer" && <Transfer onSent={() => setRefreshKey((k) => k + 1)} />}
        {active === "cards" && <Cards />}
        {active === "transactions" && <Transactions />}
        {active === "statements" && <Statements />}
      </main>
    </div>
  );
}
