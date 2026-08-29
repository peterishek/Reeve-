import React, { useState } from "react";
import { User, Building2 } from "lucide-react";
import { c } from "../theme";
import { AuthShell, Field } from "../components/AuthShell";

/**
 * UI-only for now — there's no /api/auth/register/ endpoint on the backend
 * yet (only login/refresh were built). To test the dashboard, create a user
 * via `python manage.py createsuperuser` and sign in with those credentials
 * instead. Wiring this up to a real registration endpoint is a natural
 * next backend addition.
 */
export default function SignUp({ setView }) {
  const [type, setType] = useState("personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  return (
    <AuthShell setView={setView} quote="The steadiness of a bank, the ease of an app.">
      <h1 className="f-display text-3xl" style={{ color: c.ink }}>Create your account</h1>
      <p className="f-body text-sm mt-2 mb-6" style={{ color: c.slate }}>Takes about six minutes.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setType("personal")}
          className="flex-1 f-body text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{ background: type === "personal" ? c.ink : c.white, color: type === "personal" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
        >
          <User className="w-3.5 h-3.5" /> Personal
        </button>
        <button
          onClick={() => setType("business")}
          className="flex-1 f-body text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{ background: type === "business" ? c.ink : c.white, color: type === "business" ? c.white : c.ink, border: `1px solid ${c.ink}` }}
        >
          <Building2 className="w-3.5 h-3.5" /> Business
        </button>
      </div>

      <Field label={type === "business" ? "Business name" : "Full name"} value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} show={show} toggleShow={() => setShow(!show)} />

      <button className="w-full f-body font-semibold py-3.5 rounded-xl text-white mt-2" style={{ background: c.cobalt }}>
        Create account
      </button>
      <p className="f-body text-xs text-center mt-3" style={{ color: c.slate }}>
        Registration isn't wired to the backend yet — use a superuser account to sign in and test the dashboard.
      </p>
      <p className="f-body text-xs text-center mt-3" style={{ color: c.slate }}>
        Already have an account?{" "}
        <button onClick={() => setView("signin")} className="font-semibold" style={{ color: c.ink }}>Sign in</button>
      </p>
    </AuthShell>
  );
}
