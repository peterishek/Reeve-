import React, { useState } from "react";
import Fonts from "./components/Fonts";
import NavBar from "./components/NavBar";
import Landing from "./pages/Landing";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import DashboardLayout from "./pages/dashboard/DashboardLayout";

export default function App() {
  const [view, setView] = useState("landing");

  return (
    <div className="min-h-screen f-body">
      <Fonts />
      {view === "landing" && (
        <>
          <NavBar setView={setView} />
          <Landing setView={setView} />
        </>
      )}
      {view === "signup" && <SignUp setView={setView} />}
      {view === "signin" && <SignIn setView={setView} />}
      {view === "dashboard" && <DashboardLayout onSignOut={() => setView("landing")} />}
    </div>
  );
}
