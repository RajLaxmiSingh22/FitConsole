import { useEffect, useState } from "react";
import { Button, Card, Field, LoadingState, Notice, PageHeader } from "../../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../../services/api.js";
import { contactPlaceholders } from "../../../utils/gymContact.js";

const EMPTY = { phone: "", email: "", address: "", mapUrl: "", whatsappEnabled: true };
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const MAP = /^https:\/\/(maps\.google\.com|maps\.app\.goo\.gl|(www\.)?google\.com\/maps|goo\.gl\/maps)/;

// Checks the fields as the owner types; the server checks them again on save.
function fieldErrors(form) {
  const errors = {};
  if (form.phone && !PHONE.test(form.phone.trim())) errors.phone = "Use digits, with an optional + and spaces (7–20 characters).";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.mapUrl && !MAP.test(form.mapUrl.trim())) errors.mapUrl = "Paste a Google Maps link that starts with https://";
  if (form.address.length > 300) errors.address = "Keep the address under 300 characters.";
  return errors;
}

// Owner's public contact details: phone, WhatsApp switch, email, address and map link.
export default function ContactDetailsForm() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const errors = fieldErrors(form);

  useEffect(() => {
    apiCalls.gymSettings.getContact()
      .then((response) => {
        const contact = responseData(response);
        setSaved(contact);
        setForm({ phone: contact.phone ?? "", email: contact.email ?? "", address: contact.address ?? "", mapUrl: contact.mapUrl ?? "", whatsappEnabled: contact.whatsappEnabled });
      })
      .catch((requestError) => setError(getApiError(requestError, "Unable to load contact details.")))
      .finally(() => setLoading(false));
  }, []);

  async function save(event) {
    event.preventDefault();
    if (Object.keys(errors).length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const contact = responseData(await apiCalls.gymSettings.saveContact({ ...form, phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), mapUrl: form.mapUrl.trim() }));
      setSaved(contact);
      setMessage("Contact details saved. The website shows them now.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save contact details."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading contact details…" />;
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const unsaved = saved && !saved.phone && !saved.email && !saved.address;
  return <>
    <PageHeader eyebrow="Website" title="Contact details" description="These appear on the public Contact page, in the footer and on the About page. Leave a field empty to hide it." />
    <Notice error={error} />
    {message && <Notice tone="success" error={message} />}
    {unsaved && <Notice error={`Nothing is saved yet, so the website shows placeholder text (${contactPlaceholders.phone}, ${contactPlaceholders.email}).`} />}
    <Card title="Contact details" eyebrow="Shown on the website">
      <form className="form-grid" onSubmit={save} noValidate>
        <Field label="Phone number">
          <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 …" aria-invalid={Boolean(errors.phone)} autoComplete="tel" />
          {errors.phone && <small className="field-error">{errors.phone}</small>}
        </Field>
        <Field label="Email address">
          <input type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" aria-invalid={Boolean(errors.email)} autoComplete="email" />
          {errors.email && <small className="field-error">{errors.email}</small>}
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={set("address")} placeholder="e.g. Street, area, city" aria-invalid={Boolean(errors.address)} />
          {errors.address && <small className="field-error">{errors.address}</small>}
        </Field>
        <Field label="Google Maps link">
          <input type="url" value={form.mapUrl} onChange={set("mapUrl")} placeholder="https://maps.app.goo.gl/…" aria-invalid={Boolean(errors.mapUrl)} />
          {errors.mapUrl && <small className="field-error">{errors.mapUrl}</small>}
        </Field>
        <label className="gallery-upload-check"><input type="checkbox" checked={form.whatsappEnabled} onChange={set("whatsappEnabled")} /> Show a WhatsApp button that opens a chat with this phone number</label>
        <div className="form-actions"><Button type="submit" disabled={busy || Object.keys(errors).length > 0}>{busy ? "Saving…" : "Save contact details"}</Button></div>
      </form>
    </Card>
  </>;
}
