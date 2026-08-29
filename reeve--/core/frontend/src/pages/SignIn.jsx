import React, { useState } from "react";
import { c } from "../theme";
import { AuthShell, Field } from "../components/AuthShell";
import { login, setToken } from "../lib/api";

export default function SignIn({ setView }) {
  const [identifier, setIdentifier] = useState(""); // accepts either username or email
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await login(identifier, password);
      setToken(res.access);
      setView("dashboard");
    } catch (err) {
      setError("Couldn't sign in — check your username/email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell setView={setView} quote="Plain, steady, and built to be trusted with the essentials.">
      <h1 className="f-display text-3xl" style={{ color: c.ink }}>Welcome back</h1>
      <p className="f-body text-sm mt-2 mb-6" style={{ color: c.slate }}>Sign in to your Reeve account.</p>

      <form onSubmit={handleSubmit}>
        {/* type="text", not "email" — this field accepts a username too,
            and type="email" would trigger browser validation that
            rejects plain usernames before the form even submits. */}
        <Field label="Username or email" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} show={show} toggleShow={() => setShow(!show)} />

        <div className="flex justify-end mb-2 -mt-2">
          <button type="button" className="f-body text-xs font-semibold" style={{ color: c.cobalt }}>Forgot password?</button>
        </div>

        {error && <p className="f-body text-xs mb-3" style={{ color: "#C0392B" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full f-body font-semibold py-3.5 rounded-xl text-white mt-1"
          style={{ background: c.ink, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="f-body text-xs text-center mt-5" style={{ color: c.slate }}>
        New to Reeve?{" "}
        <button onClick={() => setView("signup")} className="font-semibold" style={{ color: c.ink }}>Open an account</button>
      </p>
    </AuthShell>
  );
}
