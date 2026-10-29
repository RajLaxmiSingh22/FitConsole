import { useState } from "react";
import { Button, Card, Field, Notice, PageHeader } from "../../components/ui/index.js";
import { allergyOptions, dietOptions, goalOptions } from "../../constants/memberOptions.js";
import { apiCalls, getApiError } from "../../services/api.js";

export default function ClientProfile({ user, client, onSaved }) {
  const [form, setForm] = useState({
    phone: client.phone ?? "",
    emergencyContactPhone: client.emergencyContactPhone ?? "",
    goal: client.goal ?? "",
    address: client.address ?? "",
    dateOfBirth: client.dateOfBirth ?? "",
    gender: client.gender ?? "",
    heightCm: client.heightCm ?? "",
    weightKg: client.weightKg ?? "",
    goalCategory: client.goalCategory ?? "",
    dietPreference: client.dietPreference ?? "",
    allergies: client.allergies ?? [],
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiCalls.clients.updateMe({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        goalCategory: form.goalCategory || null,
        dietPreference: form.dietPreference || null,
      });
      setMessage("Profile updated.");
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update your profile."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Personal details" title="Your profile" description="Keep your contact information and training goal up to date." />
    <Notice error={error} />    <Notice tone="success" error={message} />
    <Card title="Profile details"><form className="form-grid" onSubmit={save}>
      <Field label="Full name"><input value={user.fullName} disabled /></Field>
      <Field label="Email"><input value={user.email} disabled /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Emergency contact"><input value={form.emergencyContactPhone} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} /></Field>
      <Field label="Training goal"><input value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></Field>
      <Field label="Address"><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
      <Field label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
      <Field label="Gender"><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></Field>
      <Field label="Height (cm)"><input type="number" min="50" max="260" step="0.1" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} /></Field>
      <Field label="Weight (kg)"><input type="number" min="20" max="400" step="0.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></Field>
      <Field label="Goal type"><select value={form.goalCategory} onChange={(event) => setForm({ ...form, goalCategory: event.target.value })}><option value="">Choose a goal</option>{goalOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Diet type"><select value={form.dietPreference} onChange={(event) => setForm({ ...form, dietPreference: event.target.value })}><option value="">Choose a diet type</option>{dietOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <fieldset className="checkbox-group"><legend>Allergies</legend>{allergyOptions.map(([value, label]) => <label className="checkbox-field" key={value}><input type="checkbox" checked={form.allergies.includes(value)} onChange={(event) => setForm({ ...form, allergies: event.target.checked ? [...form.allergies, value] : form.allergies.filter((item) => item !== value) })} /><span>{label}</span></label>)}</fieldset>
      <p className="muted">Date of birth, height, weight and goal type are used to calculate meal-plan targets. Only these numbers and categories are sent to the AI planner — never your name or contact details.</p>
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </form></Card>
  </>;
}
