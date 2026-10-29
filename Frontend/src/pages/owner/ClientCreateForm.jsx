import { useState } from "react";
import { Button, Card, Field, Notice } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

export default function ClientCreateForm({ trainers, onCreated, onCancel }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", goal: "", emergencyContactPhone: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const client = responseData(await apiCalls.clients.create(form));
      if (form.trainerId) await apiCalls.clients.assignTrainer(client.id, form.trainerId);
      onCreated();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to create client."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card title="Add client" eyebrow="Member details">
      <Notice error={error} />
      <form className="form-grid" onSubmit={submit}>
        <Field label="Full name *"><input required maxLength="255" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
        <Field label="Email *"><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Temporary password *"><input type="password" minLength="12" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Emergency contact"><input value={form.emergencyContactPhone} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} /></Field>
        <Field label="Goal"><input value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></Field>
        <Field label="Assign trainer"><select value={form.trainerId ?? ""} onChange={(event) => setForm({ ...form, trainerId: event.target.value })}><option value="">Unassigned</option>{trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName}</option>)}</select></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create client"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
      </form>
    </Card>
  );
}
