import { useEffect, useRef, useState } from "react";
import { apiCalls, getApiError, hasSessionHint, setSession } from "./api.js";
import { Button, Field, LoadingState, Notice, initials, responseData } from "./components/ui.jsx";
import DocumentationSite from "./DocumentationSite.jsx";
import PublicSite from "./PublicSite.jsx";
import ClientWorkspace from "./workspaces/ClientWorkspace.jsx";
import OwnerWorkspace from "./workspaces/OwnerWorkspace.jsx";
import TrainerWorkspace from "./workspaces/TrainerWorkspace.jsx";
import OwnerWebsiteWorkspace from "./workspaces/OwnerWebsiteWorkspace.jsx";

const navigation = {
  owner: [
    ["Dashboard", "⌂"],
    ["Clients", "♙"],
    ["Courses", "▦"],
    ["Memberships", "◷"],
    ["Trainers", "♧"],
    ["Payments", "₹"],
    ["Attendance", "✓"],
    ["Reports", "↗"],
    ["Website Leads", "✉"],
    ["Website Analytics", "◷"],
  ],
  trainer: [
    ["Dashboard", "⌂"],
    ["My clients", "♙"],
    ["Progress", "⌁"],
    ["Diet plans", "✳"],
    ["Messages", "✉"],
    ["Profile", "◉"],
  ],
  client: [
    ["Home", "⌂"],
    ["Meal plan", "✳"],
    ["Check-in", "⌁"],
    ["Membership", "▣"],
    ["Messages", "✉"],
    ["Profile", "◉"],
  ],
};

const roleTitles = { owner: "GYM OWNER", trainer: "COACH", client: "MEMBER" };

function AuthScreen({ onAuthenticated, apiStatus, ownerLoginOnly = false, initialMode = "login", notice = "" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
          <Button type="submit" className="button--wide" disabled={busy || apiStatus === "unavailable"}>{busy ? "Please wait…" : mode === "login" ? "Sign in ↗" : "Create member account ↗"}</Button>
        </form>
        {!ownerLoginOnly && <p className="auth-switch">{mode === "login" ? <>New to the gym? <button onClick={() => { window.history.pushState(null, "", "/register"); setMode("register"); setError(""); }}>Create a member account</button></> : <>Already have an account? <button onClick={() => { window.history.pushState(null, "", "/login"); setMode("login"); setError(""); }}>Sign in</button></>}</p>}
        {mode === "login" && <a className="auth-forgot-link" href="/forgot-password">Forgot your password?</a>}
        <p className="auth-staff-note">Owners and trainers are provisioned by the gym administrator.</p>
      </div>
    </section>
    <footer className="auth-footer"><span>TRAIN HARD. EAT SMART. GROW FASTER.</span><span>FITCONSOLE · 2026</span></footer>
  </main>;
}

function AppWorkspace({ user, onLogout, apiStatus, accessNotice = "" }) {
  const links = navigation[user.role] ?? navigation.client;
  // Reminder links open a specific section, e.g. /?section=Membership; unknown values fall back to the first.
  const [section, setSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    return links.some(([label]) => label === requested) ? requested : links[0][0];
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const handledPaymentOrders = useRef(new Set());
  useEffect(() => {
    const handleNavigation = (event) => {
      const requested = typeof event.detail === "string" ? event.detail : "";
      if (links.some(([label]) => label === requested)) setSection(requested);
    };
    window.addEventListener("fitconsole:navigate", handleNavigation);
    return () => window.removeEventListener("fitconsole:navigate", handleNavigation);
  }, [links]);
  useEffect(() => {
    const returnUrl = new URL(window.location.href);
    const orderId = returnUrl.searchParams.get("cashfree_order_id");
    if (!orderId || handledPaymentOrders.current.has(orderId)) return;
    handledPaymentOrders.current.add(orderId);
    returnUrl.searchParams.delete("cashfree_order_id");
    window.history.replaceState({}, document.title, returnUrl);

    apiCalls.payments.verifyCashfreeOrder(orderId).then((response) => {
      const paymentStatus = responseData(response)?.paymentStatus;
      if (paymentStatus === "success") {
        setPaymentNotice({ tone: "success", message: "Cashfree payment confirmed and recorded." });
        setSection(user.role === "owner" ? "Payments" : "Membership");
        window.dispatchEvent(new CustomEvent("fitconsole:payment-confirmed"));
      } else if (paymentStatus === "pending") {
        setPaymentNotice({ tone: "warning", message: "Cashfree payment is still pending. Check again shortly." });
      } else {
        setPaymentNotice({ tone: "error", message: "Cashfree payment was not completed." });
      }
    }).catch((error) => {
      setPaymentNotice({ tone: "error", message: getApiError(error, "Unable to verify Cashfree payment.") });
    });
  }, [user.id, user.role]);

  let workspace;
  if (user.role === "owner") workspace = section === "Website Leads" || section === "Website Analytics"
    ? <OwnerWebsiteWorkspace section={section} />
    : <OwnerWorkspace section={section} />;
  else   if (user.role === "trainer") workspace = <TrainerWorkspace
    section={section}
    user={user}
    selectedClient={selectedClient}
    onSelectClient={(client) => { setSelectedClient(client); setSection("Progress"); }}
    onNavigate={setSection}
  />;
  else workspace = <ClientWorkspace section={section} user={user} />;

  return <div className={`app-shell app-shell--${user.role}`}>
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="FitConsole"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Workspace navigation">
        {links.map(([label, icon]) => <button key={label} className={section === label ? "nav-item is-active" : "nav-item"} onClick={() => setSection(label)}><span className="nav-icon">{icon}</span><span>{label}</span>{section === label && <span className="nav-indicator" />}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className={`api-status api-status--${apiStatus}`}><i className="status-dot" />{apiStatus === "connected" ? "API connected" : apiStatus === "checking" ? "Checking API" : "API unavailable"}</div><div className="sidebar-motto">DISCIPLINE BUILDS<br />THE DISTANCE.</div></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <div className="mobile-brand"><span className="brand-mark">F</span><span>FITCONSOLE</span></div>
        <div className="workspace-breadcrumb"><span>{roleTitles[user.role] ?? "MEMBER"}</span><b>/</b>{section.toUpperCase()}</div>
        <div className="account-menu">{user.role === "owner" && <a className="docs-link workspace-docs-link" href="/docs">Documentation</a>}<span className="avatar avatar--small">{initials(user.fullName)}</span><span className="account-name"><b>{user.fullName}</b><small>{user.email}</small></span><button className="text-button logout-button" onClick={onLogout}>Log out</button></div>
      </header>
      <main className="workspace-content">{accessNotice && <Notice error={accessNotice} />}{paymentNotice && <Notice tone={paymentNotice.tone} error={paymentNotice.message} />}{workspace}</main>
      <nav className="mobile-nav" aria-label="Mobile workspace navigation">{links.map(([label, icon]) => <button key={label} className={section === label ? "mobile-nav-item is-active" : "mobile-nav-item"} onClick={() => setSection(label)}><span>{icon}</span><small>{label}</small></button>)}</nav>
    </div>
  </div>;
}

function FitConsoleApp() {
  const [path, setPath] = useState(window.location.pathname);
  const docsRequested = path === "/docs" || path.startsWith("/docs/");
  const publicPaths = ["/", "/about", "/trainers", "/programs", "/schedule", "/gallery", "/memberships", "/pricing", "/contact", "/trial", "/faq", "/privacy", "/terms", "/waiver", "/waiver-info", "/forgot-password", "/reset-password"];
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [accessNotice, setAccessNotice] = useState("");

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAccessNotice("Your session expired. Please sign in again.");
    };
    const handleAuthenticated = () => setAccessNotice("");
    window.addEventListener("fitconsole:session-expired", handleSessionExpired);
    window.addEventListener("fitconsole:authenticated", handleAuthenticated);
    return () => {
      window.removeEventListener("fitconsole:session-expired", handleSessionExpired);
      window.removeEventListener("fitconsole:authenticated", handleAuthenticated);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    apiCalls.health().then(({ data }) => {
      if (mounted) setApiStatus(data.status === "ok" ? "connected" : "unavailable");
    }).catch(() => {
      if (mounted) setApiStatus("unavailable");
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (authChecked && docsRequested && user && user.role !== "owner") {
      window.history.replaceState(null, "", "/");
      setAccessNotice("Documentation is available to owner accounts only.");
    }
  }, [authChecked, docsRequested, user]);

  useEffect(() => {
    let mounted = true;
    if (!hasSessionHint()) {
      setAuthChecked(true);
      return () => { mounted = false; };
    }
    // A page load loses the in-memory CSRF token, so restore by rotating the refresh cookie.
    apiCalls.auth.refresh().then((session) => {
      if (mounted) setUser(session.user);
    }).catch(() => {
      setSession(null);
    }).finally(() => {
      if (mounted) setAuthChecked(true);
    });
    return () => { mounted = false; };
  }, []);

  function logout() {
    apiCalls.auth.logout().catch(() => {
      // Cookies expire on their own; local state is cleared regardless.
    });
    setSession(null);
    setUser(null);
  }
  if ((publicPaths.includes(path) || path.startsWith("/reset-password/")) && !docsRequested && !(path === "/" && user)) return <PublicSite path={path === "/pricing" ? "/memberships" : path === "/waiver-info" ? "/waiver" : path} />;
  if (!authChecked) return <div className="app-loading"><span className="brand-mark">F</span><LoadingState label="Restoring your session…" /></div>;
  if (docsRequested && user?.role === "owner") return <DocumentationSite />;
  if (!user) return <AuthScreen apiStatus={apiStatus} onAuthenticated={setUser} ownerLoginOnly={docsRequested} initialMode={path === "/register" ? "register" : "login"} notice={accessNotice} />;
  return <AppWorkspace user={user} onLogout={logout} apiStatus={apiStatus} accessNotice={accessNotice} />;
}

export default function App() {
  return <FitConsoleApp />;
}
