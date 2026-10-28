import { useEffect, useMemo, useState } from "react";
import { apiCalls, getApiError } from "./api.js";
import { Button, Field, LoadingState, Notice, responseData } from "./components/ui.jsx";

const publicLinks = [
  ["About", "/about"], ["Trainers", "/trainers"], ["Programs", "/programs"],
  ["Schedule", "/schedule"], ["Gallery", "/gallery"], ["Pricing", "/memberships"],
  ["Contact", "/contact"], ["FAQ", "/faq"],
];
const legalCopy = {
  "/privacy": ["Privacy notice", "Gym-specific privacy information is not configured yet. With your permission, this site stores first-party visitor and session identifiers to count public page visits. It does not send analytics events before you accept, and does not store IP addresses or device fingerprints in analytics records. Contact the gym for its approved privacy policy."],
  "/terms": ["Terms of use", "Terms of use have not been configured by this gym yet. Please request the current terms from the gym before joining."],
  "/waiver": ["Training waiver", "The gym's waiver information is not configured for this public website. Any required waiver will be presented through the member workflow."],
};
const analyticsConsentKey = "fitconsole.analyticsConsent";
const analyticsVisitorKey = "fitconsole.analyticsVisitorId";
const analyticsSessionKey = "fitconsole.analyticsSessionId";

function usePublicCatalog() {
  const [catalog, setCatalog] = useState({ courses: [], trainers: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    Promise.all([apiCalls.courses.list(), apiCalls.trainers.list()])
      .then(([courses, trainers]) => {
        if (active) setCatalog({ courses: responseData(courses) ?? [], trainers: responseData(trainers) ?? [], loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setCatalog({ courses: [], trainers: [], loading: false, error: getApiError(error, "Unable to load public gym information.") });
      });
    return () => { active = false; };
  }, []);
  return catalog;
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header">
    <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
    <button className="public-menu-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
    <nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Public navigation">
      {publicLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      <a href="/login">Sign in</a><a className="button button--primary" href="/trial">Book a trial</a>
    </nav>
  </header>;
}

function SiteFooter() {
  return <footer className="public-footer">
    <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
    <p>Train hard. Eat smart. Grow faster.</p>
    <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/waiver">Waiver info</a><button type="button" className="analytics-preferences-link" onClick={() => window.dispatchEvent(new Event("fitconsole:analytics-preferences"))}>Analytics preferences</button></nav>
  </footer>;
}

function CourseCards({ courses, loading }) {
  if (loading) return <LoadingState label="Loading programs…" />;
  if (!courses.length) return <p className="public-unconfigured">Programs are not configured yet.</p>;
  return <div className="public-card-grid">{courses.map((course) => {
    const plans = (course.CoursePlans ?? course.Plans ?? []).filter((plan) => plan.active !== false);
    const prices = plans.map((plan) => Number(plan.price)).filter(Number.isFinite);
    const price = prices.length ? Math.min(...prices) : null;
    return <article className="public-card" key={course.id}>
      <span className="overline">{course.category || "PROGRAM"}</span><h3>{course.name}</h3>
      <p>{course.description || "Program details are not configured."}</p>
      <div className="public-card-meta">{price === null ? "Pricing not configured" : `From ₹${price.toLocaleString("en-IN")}`}</div>
      <a className="text-button" href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Ask about this program ↗</a>
    </article>;
  })}</div>;
}

function TrainerCards({ trainers, loading }) {
  if (loading) return <LoadingState label="Loading trainer profiles…" />;
  if (!trainers.length) return <p className="public-unconfigured">Trainer profiles are not configured yet.</p>;
  return <div className="public-card-grid">{trainers.map((trainer) => <article className="public-card" key={trainer.userId ?? trainer.id}>
    <div className="public-avatar">{(trainer.User?.fullName ?? "FC").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
    <span className="overline">TRAINER</span><h3>{trainer.User?.fullName ?? "Trainer"}</h3>
    <p>{trainer.certification || "Certification not configured."}</p>
    <div className="public-card-meta">{trainer.experienceYears == null ? "Experience not configured" : `${trainer.experienceYears} years experience`}</div>
  </article>)}</div>;
}

function TrialBooking({ courses }) {
  const params = new URLSearchParams(window.location.search);
  const [form, setForm] = useState({ name: "", phone: "", email: "", courseId: params.get("courseId") ?? "", preferredDate: "", preferredSlot: "", message: "", consent: false });
  const [state, setState] = useState({ busy: false, error: "", received: false });
  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: "", received: false });
    const source = params.get("source") || "website";
    try {
      await apiCalls.public.trialBooking({
        ...form, email: form.email || undefined, courseId: form.courseId || undefined,
        preferredDate: form.preferredDate || undefined, preferredSlot: form.preferredSlot || undefined,
        message: form.message || undefined, consent: true, source, landingPage: window.location.pathname,
        utmSource: params.get("utm_source") || undefined, utmMedium: params.get("utm_medium") || undefined,
        utmCampaign: params.get("utm_campaign") || undefined,
      });
      setState({ busy: false, error: "", received: true });
      setForm({ name: "", phone: "", email: "", courseId: "", preferredDate: "", preferredSlot: "", message: "", consent: false });
    } catch (error) {
      setState({ busy: false, error: getApiError(error, "Unable to send your trial request.") });
    }
  }
  return <section className="public-form-wrap"><div><p className="overline">YOUR FIRST ROUND</p><h2>Request a trial.</h2><p>Send your details and the gym can follow up. Submitting this form is a request only; it does not confirm a booking.</p></div>
    <form className="public-form" onSubmit={submit}>
      <Notice error={state.error} /><Notice tone="success" error={state.received ? "Request received. The gym will contact you to confirm availability." : ""} />
      <Field label="Name *"><input required maxLength="255" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Phone *"><input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Email"><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
      <Field label="Program"><select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">Any / not sure</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
      <Field label="Preferred date"><input type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} /></Field>
      <Field label="Preferred time"><input maxLength="100" placeholder="Not configured — enter a preference" value={form.preferredSlot} onChange={(event) => setForm({ ...form, preferredSlot: event.target.value })} /></Field>
      <Field label="Message" className="field--wide"><textarea rows="3" maxLength="2000" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
      <label className="checkbox-field field--wide"><input type="checkbox" required checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span>I agree that the gym may contact me about this trial request. See <a href="/privacy">privacy information</a>.</span></label>
      <div className="form-actions"><Button type="submit" disabled={state.busy}>{state.busy ? "Sending…" : "Send trial request ↗"}</Button></div>
    </form>
  </section>;
}

const faqs = [
  ["How do I try a session?", "Send a trial request and the gym will contact you to confirm availability."],
  ["What are the opening hours?", "Opening hours are not configured on this website yet."],
  ["How much does membership cost?", "Prices shown on the Programs page come from active configured plans. If no plans are listed, pricing is not configured."],
  ["Where is the gym?", "The gym address is not configured on this website yet."],
  ["Can I choose a trainer or program?", "You can select a configured program in your trial request. Trainer availability is confirmed by the gym."],
];

export default function PublicSite({ path }) {
  const catalog = usePublicCatalog();
  const [analyticsConsent, setAnalyticsConsent] = useState(() => localStorage.getItem(analyticsConsentKey) ?? "");
  const [showConsentSettings, setShowConsentSettings] = useState(() => !localStorage.getItem(analyticsConsentKey));
  const [recovery, setRecovery] = useState({ email: "", password: "", token: new URLSearchParams(window.location.search).get("token") ?? path.split("/").at(-1), busy: false, error: "", success: "" });
  useEffect(() => {
    const openPreferences = () => setShowConsentSettings(true);
    window.addEventListener("fitconsole:analytics-preferences", openPreferences);
    return () => window.removeEventListener("fitconsole:analytics-preferences", openPreferences);
  }, []);
  useEffect(() => {
    if (analyticsConsent !== "accepted" || path.startsWith("/reset-password")) return;
    const getId = (storage, key) => {
      let id = storage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        storage.setItem(key, id);
      }
      return id;
    };
    const params = new URLSearchParams(window.location.search);
    apiCalls.analytics.event({
      eventId: crypto.randomUUID(),
      visitorId: getId(localStorage, analyticsVisitorKey),
      sessionId: getId(sessionStorage, analyticsSessionKey),
      type: "page_view",
      page: window.location.pathname,
      source: params.get("source") || undefined,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      consent: true,
    }).catch((error) => console.error("Consent-based analytics event was not recorded.", error));
  }, [analyticsConsent, path]);
  function chooseAnalyticsConsent(choice) {
    localStorage.setItem(analyticsConsentKey, choice);
    setAnalyticsConsent(choice);
    setShowConsentSettings(false);
  }
  const title = useMemo(() => ({
    "/about": "Training with purpose.", "/trainers": "Meet your corner.",
    "/programs": "Find your next round.", "/schedule": "Make time to train.",
    "/gallery": "Inside the gym.", "/memberships": "Memberships & pricing.",
    "/contact": "Start a conversation.", "/trial": "Your first round.",
    "/faq": "Good questions.", ...Object.fromEntries(Object.entries(legalCopy).map(([url, [heading]]) => [url, heading])),
    "/forgot-password": "Reset your password.", "/reset-password": "Choose a new password.",
  }[path.startsWith("/reset-password/") ? "/reset-password" : path] ?? "Earn your next round."), [path]);
  const page = path === "/" ? "home" : path.slice(1);
  const isLegal = Boolean(legalCopy[path]);
  return <div className="public-site">
    <SiteHeader />
    <main>
      {page === "home" ? <>
        <section className="public-hero">
          <div className="public-hero-copy"><p className="overline"><span className="red-dot" /> TRAIN WITH PURPOSE</p><h1>Earn your<br /><span>next round.</span></h1><p>Training, nutrition, and your gym journey — all in your corner.</p><div className="public-hero-actions"><a className="button button--primary" href="/trial">Request a trial ↗</a><a className="button button--outline" href="/programs">Explore programs</a></div></div>
          <div className="public-hero-art" aria-hidden="true"><span>FC</span><small>DISCIPLINE BUILDS<br />THE DISTANCE</small></div>
        </section>
        <section className="public-section"><div className="public-section-heading"><div><p className="overline">FIND YOUR FOCUS</p><h2>Training built around you.</h2></div><a href="/programs">All programs ↗</a></div><Notice error={catalog.error} /><CourseCards courses={catalog.courses.slice(0, 3)} loading={catalog.loading} /></section>
        <section className="public-cta"><div><p className="overline">READY WHEN YOU ARE</p><h2>Take the first step.</h2></div><a className="button button--primary" href="/trial">Book a trial ↗</a></section>
      </> : <section className="public-page">
        <p className="overline"><span className="red-dot" /> FITCONSOLE · {page.replaceAll("-", " ").toUpperCase()}</p><h1>{title}</h1>
        {page === "about" && <div className="public-prose"><p>FitConsole helps your gym bring training, coaching, and member support together. Gym-specific story and facility details have not been configured here yet.</p><p>Explore current programs or request a trial to hear from the team.</p><a className="button button--primary" href="/trial">Request a trial ↗</a></div>}
        {(page === "trainers" || page === "programs" || page === "memberships") && <><Notice error={catalog.error} />{page === "trainers" ? <TrainerCards trainers={catalog.trainers} loading={catalog.loading} /> : <CourseCards courses={catalog.courses} loading={catalog.loading} />}</>}
        {page === "schedule" && <div className="public-unconfigured">Class schedule and opening hours are not configured yet. Request a trial and the gym can share current availability.</div>}
        {page === "gallery" && <div className="public-unconfigured">Gallery images are not configured yet.</div>}
        {page === "contact" && <div className="public-contact-grid"><div className="public-prose"><h2>Contact details</h2><p>Address, phone, email, and opening hours are not configured for this website yet.</p></div><div className="public-form">
          <p>Want the gym to get in touch?</p><a className="button button--primary" href="/trial">Send a trial request ↗</a>
        </div></div>}
        {page === "trial" && <TrialBooking courses={catalog.courses} />}
        {page === "faq" && <div className="public-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>}
        {(page === "forgot-password" || page === "reset-password" || page.startsWith("reset-password/")) && <form className="public-recovery-form" onSubmit={async (event) => {
          event.preventDefault();
          setRecovery((current) => ({ ...current, busy: true, error: "", success: "" }));
          try {
            if (page === "forgot-password") {
              await apiCalls.auth.requestPasswordReset(recovery.email);
              setRecovery((current) => ({ ...current, busy: false, success: "If an account matches that email, password reset instructions will be sent." }));
            } else {
              const token = recovery.token || new URLSearchParams(window.location.search).get("token") || "";
              await apiCalls.auth.resetPassword({ token, newPassword: recovery.password });
              setRecovery((current) => ({ ...current, busy: false, success: "Password updated. You can now sign in.", password: "" }));
            }
          } catch (error) {
            setRecovery((current) => ({ ...current, busy: false, error: getApiError(error) }));
          }
        }}>
          <Notice error={recovery.error} /><Notice tone="success" error={recovery.success} />
          {page === "forgot-password" ? <Field label="Email address"><input type="email" autoComplete="email" required value={recovery.email} onChange={(event) => setRecovery({ ...recovery, email: event.target.value })} /></Field> : <>
            <Field label="Reset token"><input required value={recovery.token} onChange={(event) => setRecovery({ ...recovery, token: event.target.value })} /></Field>
            <Field label="New password"><input type="password" autoComplete="new-password" minLength="12" required value={recovery.password} onChange={(event) => setRecovery({ ...recovery, password: event.target.value })} /></Field>
          </>}
          <Button type="submit" disabled={recovery.busy}>{recovery.busy ? "Please wait…" : page === "forgot-password" ? "Send reset instructions" : "Update password"}</Button>
          <a className="text-button" href="/login">Back to sign in</a>
        </form>}
        {isLegal && <div className="public-prose"><p>{legalCopy[path][1]}</p></div>}
      </section>}
    </main>
    <SiteFooter />
    {showConsentSettings && <aside className="analytics-consent" role="dialog" aria-label="Analytics preferences">
      <div><strong>Choose analytics preferences</strong><p>Optional first-party analytics counts public page visits. It is off unless you accept. See the <a href="/privacy">privacy notice</a>.</p></div>
      <div className="analytics-consent-actions">
        <Button variant="outline" onClick={() => chooseAnalyticsConsent("declined")}>Decline</Button>
        <Button onClick={() => chooseAnalyticsConsent("accepted")}>Accept analytics</Button>
        {analyticsConsent && <button className="analytics-consent-close" type="button" onClick={() => setShowConsentSettings(false)}>Close</button>}
      </div>
    </aside>}
  </div>;
}
