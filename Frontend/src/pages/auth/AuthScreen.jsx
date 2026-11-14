import { useState } from "react";
import { Button, Field, Notice } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData, setSession } from "../../services/api.js";

export default function AuthScreen({ onAuthenticated, apiStatus, ownerLoginOnly = false, initialMode = "login", notice = "" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [demoBusy, setDemoBusy] = useState(false);

  // One click into the shared demo member account; the server holds the credentials.
  async function startDemo() {
    setDemoBusy(true);
    setError("");
    try {
      const data = responseData(await apiCalls.auth.demoLogin());
      setSession(data);
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new CustomEvent("fitconsole:authenticated"));
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(getApiError(requestError, "The live demo is not available right now."));
      setDemoBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = mode === "login"
        ? await apiCalls.auth.login({ email: form.email, password: form.password })
        : await apiCalls.auth.register(form);
      const data = responseData(response);
      setSession(data);
      window.dispatchEvent(new CustomEvent("fitconsole:authenticated"));
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(getApiError(requestError, mode === "login" ? "Unable to sign in." : "Unable to create your account."));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-screen">
    <header className="auth-topbar"><a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a><div className="auth-top-actions"><span className={`api-status api-status--${apiStatus}`}><i className="status-dot" />{apiStatus === "connected" ? "API CONNECTED" : apiStatus === "checking" ? "CONNECTING" : "API OFFLINE"}</span></div></header>
    <section className="auth-layout">
      <div className="auth-copy">
        <p className="overline"><span className="red-dot" /> FIGHT NIGHT · TRAIN WITH PURPOSE</p>
        <h1>Earn your<br /><span>next round.</span></h1>
        <p>Training, nutrition, and your gym journey — all in your corner.</p>
        <div className="auth-stamp"><span>FC</span><small>BUILT FOR<br />THE LONG GAME</small></div>
      </div>
      <div className="auth-card panel">
        <div className="auth-card-heading"><p className="overline">{ownerLoginOnly ? "OWNER ACCESS" : mode === "login" ? "WELCOME BACK" : "YOUR FIRST ROUND"}</p><h2>{mode === "login" ? "Sign in." : "Create account."}</h2><p>{ownerLoginOnly ? "Sign in with an owner account to open the documentation." : mode === "login" ? "Step back into your FitConsole." : "Member accounts are open. Staff accounts are created by your gym."}</p></div>
        {notice && <Notice error={notice} />}
        <Notice error={error} />
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <Field label="Full name"><input autoComplete="name" required maxLength="255" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>}
          <Field label="Email address"><input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Password"><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          <Button type="submit" className="button--wide" disabled={busy || demoBusy || apiStatus === "unavailable"}>{busy ? "Please wait…" : mode === "login" ? "Sign in ↗" : "Create member account ↗"}</Button>
        </form>
        {mode === "login" && !ownerLoginOnly && <div className="auth-demo">
          <div className="auth-divider" aria-hidden="true"><span>or</span></div>
          <Button type="button" variant="outline" className="button--wide auth-demo-button" onClick={startDemo} disabled={demoBusy || busy || apiStatus === "unavailable"} aria-busy={demoBusy}>
            {demoBusy ? <><span className="loader" aria-hidden="true" />Opening demo…</> : "Explore Live Demo →"}
          </Button>
          <p className="auth-demo-caption">Experience FitConsole with a sample gym member account. No registration required.</p>
        </div>}
        {!ownerLoginOnly && <p className="auth-switch">{mode === "login" ? <>New to the gym? <button onClick={() => { window.history.pushState(null, "", "/register"); setMode("register"); setError(""); }}>Create a member account</button></> : <>Already have an account? <button onClick={() => { window.history.pushState(null, "", "/login"); setMode("login"); setError(""); }}>Sign in</button></>}</p>}
        {mode === "login" && <a className="auth-forgot-link" href="/forgot-password">Forgot your password?</a>}
        <p className="auth-staff-note">Owners and trainers are provisioned by the gym administrator.</p>
      </div>
    </section>
    <footer className="auth-footer"><span>TRAIN HARD. EAT SMART. GROW FASTER.</span><span>FITCONSOLE · 2026</span></footer>
  </main>;
}
