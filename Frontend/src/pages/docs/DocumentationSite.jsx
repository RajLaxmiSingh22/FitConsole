import React from "react";
import { endpoints, sections } from "../../constants/documentation.js";

function Code({ children }) {
  return <code className="docs-code">{children}</code>;
}

export default function DocumentationSite() {
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    const originalTitle = document.title;
    document.title = "FitConsole Documentation";
    return () => { document.title = originalTitle; };
  }, []);
  const filteredEndpoints = endpoints.filter((endpoint) => endpoint.join(" ").toLowerCase().includes(search.toLowerCase()));
  return <div className="docs-site">
    <header className="docs-topbar">
      <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
      <div className="docs-top-actions"><span>OWNER ACCESS ONLY</span><a className="button" href="/">Back to app ↗</a></div>
    </header>
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <p className="overline">DOCUMENTATION</p>
        <nav>{sections.map(([id, label], index) => <a key={id} href={`#${id}`}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}</nav>
        <p className="docs-sidebar-foot">FITCONSOLE · FIGHT NIGHT</p>
      </aside>
      <main className="docs-content">
        <section className="docs-hero" id="overview">
          <p className="overline"><span className="red-dot" /> OWNER DOCUMENTATION</p>
          <h1>Your gym,<br /><span>in your corner.</span></h1>
          <p>Product and API documentation for the FitConsole gym management platform. Learn how each role uses the workspace and how to connect to the API.</p>
          <div className="docs-hero-meta"><span>PRODUCT GUIDE</span><span>API REFERENCE</span><span>UPDATED OCT 2026</span></div>
        </section>

        <section className="docs-section" id="getting-started">
          <div className="docs-section-title"><span>01</span><div><p className="overline">START HERE</p><h2>Getting started</h2></div></div>
          <p>FitConsole is a role-based gym operations app. Owners manage the business, trainers coach assigned clients, and clients track their own membership and progress.</p>
          <div className="docs-card-grid">
            <article className="docs-card"><span className="docs-card-index">01 / ACCOUNT</span><h3>Sign in or register</h3><p>Members can create an account from the sign-in screen. Owner and trainer accounts are provisioned by the gym owner; they cannot self-register.</p></article>
            <article className="docs-card"><span className="docs-card-index">02 / WORKSPACE</span><h3>Use your role workspace</h3><p>After sign-in, FitConsole opens the workspace that matches your account role. Navigation and data access are controlled by the API.</p></article>
            <article className="docs-card"><span className="docs-card-index">03 / SESSION</span><h3>Keep your session safe</h3><p>The browser stores a bearer token to restore your session. Use “Log out” on shared devices to remove it from the browser.</p></article>
          </div>
          <div className="docs-callout"><b>LOCAL DEVELOPMENT</b><span>Start the backend and frontend in separate terminals. Set <Code>VITE_API_URL</Code> in <Code>Frontend/.env</Code> to your API base URL (defaults to <Code>http://localhost:9000/api</Code>). The backend needs database configuration, a JWT secret, and the single owner account’s <Code>OWNER_EMAIL</Code> and <Code>OWNER_PASSWORD</Code> in its environment. On startup, FitConsole creates or syncs that account and disables owner access for any other owner accounts.</span></div>
          <div className="docs-code-block"><div>LOCAL START COMMANDS</div><pre>{`cd Backend && npm run dev\ncd Frontend && npm run dev`}</pre></div>
        </section>

        <section className="docs-section" id="roles">
          <div className="docs-section-title"><span>02</span><div><p className="overline">ACCESS BY ROLE</p><h2>Workspaces & roles</h2></div></div>
          <p>Role-based permissions are enforced by the backend. A trainer can only access clients assigned to that trainer, and clients can only access their own records.</p>
          <div className="docs-role-grid">
            <article className="docs-role-card docs-role-card--owner"><span>OWNER</span><h3>Run the gym</h3><ul><li>Manage clients, trainers, courses, and prices</li><li>Enroll members and manage renewals</li><li>Record payments, attendance, and export reports</li><li>See owner dashboard metrics</li></ul></article>
            <article className="docs-role-card docs-role-card--trainer"><span>TRAINER</span><h3>Coach your roster</h3><ul><li>View assigned clients and their progress</li><li>Review check-ins and weight history</li><li>Generate, edit, and approve diet-plan drafts</li><li>Message clients you coach</li></ul></article>
            <article className="docs-role-card docs-role-card--client"><span>CLIENT</span><h3>Track your journey</h3><ul><li>View membership and recorded payments</li><li>Log diet and wellness check-ins</li><li>See trainer-approved meal plans only</li><li>Accept the current waiver and message your coach</li></ul></article>
          </div>
        </section>

        <section className="docs-section" id="api">
          <div className="docs-section-title"><span>03</span><div><p className="overline">FOR DEVELOPERS</p><h2>API reference</h2></div></div>
          <p>JSON API routes are prefixed with <Code>/api</Code>. Authenticated requests use a JWT bearer token. Role and record-level authorization apply in addition to authentication.</p>
          <div className="docs-code-block"><div><span className="docs-live-dot" /> AUTHENTICATED REQUEST</div><pre>{`Cookie: fc_access=<httpOnly session cookie>\nX-CSRF-Token: <csrfToken from login/refresh>\nContent-Type: application/json`}</pre></div>
          <div className="docs-callout docs-callout--subtle"><b>RESPONSE SHAPE</b><span>Most API responses use <Code>{`{ "status": "success", "data": ... }`}</Code>. Validation failures return HTTP 400 with a message and structured validation details. Never put credentials or API keys in frontend code.</span></div>
          <div className="docs-endpoint-toolbar"><div><h3>Endpoint directory</h3><p>{filteredEndpoints.length} endpoints</p></div><input type="search" placeholder="Search paths, roles, or features" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search API endpoints" /></div>
          <div className="docs-table-wrap"><table className="docs-endpoint-table"><thead><tr><th>Method</th><th>Endpoint</th><th>Access</th><th>Description</th></tr></thead><tbody>{filteredEndpoints.map(([method, path, access, description]) => <tr key={`${method} ${path}`}><td><span className={`http-method http-method--${method.toLowerCase()}`}>{method}</span></td><td><code>{path}</code></td><td>{access}</td><td>{description}</td></tr>)}</tbody></table>{filteredEndpoints.length === 0 && <p className="docs-no-results">No endpoints match that search.</p>}</div>
          <p className="docs-footnote">`:id`, `:entryId`, and `:planId` are path parameters. Query filters shown with `?` are optional unless noted. The API validates request inputs using Joi.</p>
        </section>

        <section className="docs-section" id="diet-plans">
          <div className="docs-section-title"><span>04</span><div><p className="overline">AI ASSISTANCE</p><h2>AI diet plans</h2></div></div>
          <p>Trainers can request a generated wellness-plan draft for an assigned client. Drafts are private to the trainer until manually reviewed and approved; only approved plans appear in the client workspace.</p>
          <div className="docs-flow"><div><span>01</span><b>Generate</b><small>Trainer requests a draft for an assigned client.</small></div><i>→</i><div><span>02</span><b>Review</b><small>Trainer inspects and edits the generated content.</small></div><i>→</i><div><span>03</span><b>Approve</b><small>Client can then view the approved plan.</small></div></div>
          <div className="docs-callout docs-callout--warning"><b>CONFIGURATION & SAFETY</b><span>Generation requires a Gemini API key configured on the backend. The backend defaults to Gemini 2.5 Flash-Lite; availability, quotas, and pricing depend on the Google AI Studio project and current terms. Generated content is general wellness guidance, not medical advice. Trainers must review it before approval.</span></div>
        </section>

        <section className="docs-section" id="privacy">
          <div className="docs-section-title"><span>05</span><div><p className="overline">IMPORTANT DETAILS</p><h2>Privacy & limitations</h2></div></div>
          <div className="docs-limit-list">
            <article><span>01</span><div><h3>Client privacy</h3><p>Trainer data access is restricted to assigned clients. Conversation messages are limited to participants and permitted coach/client or owner relationships.</p></div></article>
            <article><span>02</span><div><h3>Payments & reminders</h3><p>Owners publish course durations and prices in Courses & Pricing; clients see those offers in Membership and can choose one to start Cashfree checkout. Owners can also record collections or start Cashfree checkout; successful Cashfree payments are verified by the API before being added to payment history. A reminder date is a follow-up record; the API does not send email, SMS, or push reminders.</p></div></article>
            <article><span>03</span><div><h3>Identity documents</h3><p>The ID-proof endpoint stores a reference string only. File upload and storage are not implemented.</p></div></article>
            <article><span>04</span><div><h3>Waiver records</h3><p>Acceptance records include the current waiver version and server-recorded timestamp. Configure waiver text and version in the backend environment.</p></div></article>
            <article><span>05</span><div><h3>Data & availability</h3><p>Dashboard values reflect data returned by the current API. Some reporting ideas shown in design references, such as revenue breakdowns by peak hour, are not currently exposed as API metrics.</p></div></article>
          </div>
        </section>
        <footer className="docs-footer"><a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a><span>TRAIN HARD. EAT SMART. GROW FASTER.</span><a href="#">BACK TO TOP ↑</a></footer>
      </main>
    </div>
  </div>;
}
