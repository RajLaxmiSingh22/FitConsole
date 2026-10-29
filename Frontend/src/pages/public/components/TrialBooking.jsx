import { useState } from "react";
import { Button, Field, Notice } from "../../../components/ui/index.js";
import { apiCalls, getApiError } from "../../../services/api.js";

export default function TrialBooking({ courses }) {
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
