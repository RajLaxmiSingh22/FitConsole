import { useState } from "react";
import { Notice } from "../components/ui/index.js";
import { navigation, roleTitles } from "../constants/navigation.js";
import { useNavigationEvents } from "../hooks/useNavigationEvents.js";
import { usePaymentReturn } from "../hooks/usePaymentReturn.js";
import RoleWorkspace from "../pages/RoleWorkspace.jsx";
import { initials } from "../utils/format.js";

export default function AppShell({ user, onLogout, apiStatus, accessNotice = "" }) {
  const links = navigation[user.role] ?? navigation.client;
  // Reminder links open a specific section, e.g. /?section=Membership; unknown values fall back to the first.
  const [section, setSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    return links.some(([label]) => label === requested) ? requested : links[0][0];
  });
  const paymentNotice = usePaymentReturn(user, setSection);
  useNavigationEvents(links, setSection);

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
      <main className="workspace-content">{accessNotice && <Notice error={accessNotice} />}{paymentNotice && <Notice tone={paymentNotice.tone} error={paymentNotice.message} />}<RoleWorkspace user={user} section={section} onNavigate={setSection} /></main>
      <nav className="mobile-nav" aria-label="Mobile workspace navigation">{links.map(([label, icon]) => <button key={label} className={section === label ? "mobile-nav-item is-active" : "mobile-nav-item"} onClick={() => setSection(label)}><span>{icon}</span><small>{label}</small></button>)}</nav>
    </div>
  </div>;
}
