import { useState } from "react";
import { Button, Card, EmptyState, Field, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError } from "../../services/api.js";
import { initials } from "../../utils/format.js";

export default function TrainerDirectory({ trainers, onRefresh }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", certification: "", experienceYears: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.users.createTrainer({ ...form, experienceYears: form.experienceYears === "" ? undefined : Number(form.experienceYears) });
      setForm({ fullName: "", email: "", password: "", phone: "", certification: "", experienceYears: "" });
      setShowForm(false);
      onRefresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to provision trainer."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeader eyebrow={`${trainers.length} trainer profiles`} title="Trainers" description="Provision staff accounts and see the programs they teach." actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ Add trainer"}</Button>} />
      <Notice error={error} />
      {showForm && <Card title="Add trainer" eyebrow="Staff account"><form className="form-grid" onSubmit={submit}>
        <Field label="Full name *"><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
        <Field label="Email *"><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Temporary password *"><input type="password" minLength="12" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Certification"><input value={form.certification} onChange={(event) => setForm({ ...form, certification: event.target.value })} /></Field>
        <Field label="Experience (years)"><input type="number" min="0" step="0.1" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create trainer"}</Button></div>
      </form></Card>}
      {trainers.length ? <div className="trainer-grid">{trainers.map((trainer) => <Card key={trainer.userId} className="trainer-card">
        <div className="person-cell"><span className="avatar avatar--large">{initials(trainer.User?.fullName)}</span><span><h2>{trainer.User?.fullName}</h2><small>{trainer.certification || "Trainer"}</small></span></div>
        <div className="trainer-meta"><span>Experience</span><b>{trainer.experienceYears ?? trainer.TrainerDetail?.experienceYears ?? "—"} years</b><span>Phone</span><b>{trainer.phone || "—"}</b></div>
        <div className="tag-list">{trainer.Courses?.length ? trainer.Courses.map((course) => <StatusPill key={course.id} tone="neutral">{course.name}</StatusPill>) : <span className="muted">No courses assigned</span>}</div>
      </Card>)}</div> : <EmptyState title="No trainers yet" detail="Create staff accounts here. Trainers cannot self-register." />}
    </>
  );
}
