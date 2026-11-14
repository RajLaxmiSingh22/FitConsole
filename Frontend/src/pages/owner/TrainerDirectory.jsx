import { useState } from "react";
import ClientAnalytics from "../../components/analytics/ClientAnalytics.jsx";
import { Avatar, Button, Card, EmptyState, Field, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError } from "../../services/api.js";
import { initials } from "../../utils/format.js";
import { consumeNavigationIntent } from "../../utils/navigationIntent.js";
import { programTone } from "../../utils/programTone.js";

const years = (trainer) => {
  const value = trainer.experienceYears ?? trainer.TrainerDetail?.experienceYears;
  return value == null ? null : Number(value);
};

function TrainerProfileView({ trainer, clients, onBack, onOpenClient }) {
  const assigned = clients.filter((client) => client.trainerId === trainer.id);
  return <>
    <PageHeader eyebrow="Coach profile" title={trainer.User?.fullName ?? "Trainer"} description={trainer.certification || "Coach"} actions={<Button variant="ghost" onClick={onBack}>← All trainers</Button>} />
    <div className="dashboard-grid">
      <Card title="About" eyebrow="Profile">
        <div className="coach-card"><Avatar userId={trainer.userId} name={trainer.User?.fullName} version={trainer.avatarVersion} className="avatar avatar--large" /><div><b>{trainer.User?.fullName}</b><small>{years(trainer) != null ? `${years(trainer)}+ years coaching` : "Experience not set"} · {trainer.phone || "No phone"}</small></div></div>
        {trainer.bio && <p className="trainer-profile-bio">{trainer.bio}</p>}
        {trainer.specialties?.length > 0 && <div className="tag-list">{trainer.specialties.map((tag) => <StatusPill key={tag} tone="neutral">{tag}</StatusPill>)}</div>}
        {trainer.achievements?.length > 0 && <ul className="trainer-achievements trainer-profile-achievements">{trainer.achievements.map((item) => <li key={item}><span aria-hidden="true">★</span>{item}</li>)}</ul>}
      </Card>
      <Card title="Courses" eyebrow={`${trainer.Courses?.length ?? 0} assigned`}>
        {trainer.Courses?.length ? <div className="tag-list">{trainer.Courses.map((course) => <StatusPill key={course.id} tone="primary">{course.name}</StatusPill>)}</div> : <EmptyState title="No courses assigned" />}
      </Card>
    </div>
    <Card title="Assigned members" eyebrow={`${assigned.length} members`}>
      {assigned.length ? <div className="trainer-member-grid">{assigned.map((client) => <button key={client.id} type="button" className="member-link trainer-member" onClick={() => onOpenClient(client.id)}>
        <span className="avatar">{initials(client.User?.fullName)}</span><span><b>{client.User?.fullName ?? "Member"}</b><small>{client.phone || client.User?.email}</small></span>
      </button>)}</div> : <EmptyState title="No assigned members" detail="Assign members to this coach from the Clients page." />}
    </Card>
  </>;
}

export default function TrainerDirectory({ trainers, clients = [], onRefresh }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", certification: "", experienceYears: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState(() => consumeNavigationIntent("trainer")?.id ?? null);
  const [clientId, setClientId] = useState(null);

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

  if (clientId) return <ClientAnalytics clientId={clientId} viewerRole="owner" onBack={() => setClientId(null)} />;
  const profile = trainers.find((trainer) => trainer.userId === profileId);
  if (profile) return <TrainerProfileView trainer={profile} clients={clients} onBack={() => setProfileId(null)} onOpenClient={setClientId} />;

  const counts = new Map();
  for (const client of clients) counts.set(client.trainerId, (counts.get(client.trainerId) ?? 0) + 1);
  return (
    <>
      <PageHeader eyebrow={`${trainers.length} trainer profiles`} title="Trainers" description="Your coaching team, their programs and the members they look after." actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ Add trainer"}</Button>} />
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
      {trainers.length ? <div className="coach-grid">{trainers.map((trainer) => <article key={trainer.userId} className={`coach-tile tt-tone-${programTone(trainer.Courses?.[0]?.category)}`}>
        <button type="button" className="coach-tile-main" onClick={() => setProfileId(trainer.userId)} aria-label={`View ${trainer.User?.fullName}'s profile`}>
          <Avatar userId={trainer.userId} name={trainer.User?.fullName} version={trainer.avatarVersion} className="avatar avatar--large" />
          <span className="coach-tile-id"><b>{trainer.User?.fullName}</b><small>{trainer.certification || "Coach"}</small></span>
        </button>
        <dl className="coach-tile-stats">
          <div><dt>Experience</dt><dd>{years(trainer) != null ? `${years(trainer)}+ yrs` : "—"}</dd></div>
          <div><dt>Members</dt><dd>{counts.get(trainer.id) ?? 0}</dd></div>
          <div><dt>Phone</dt><dd>{trainer.phone || "—"}</dd></div>
        </dl>
        {trainer.specialties?.length > 0 && <div className="coach-tile-tags">{trainer.specialties.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <div className="coach-tile-foot">
          <span className="coach-tile-courses">{trainer.Courses?.length ? trainer.Courses.map((course) => course.name).join(" · ") : "No courses assigned"}</span>
          <Button variant="outline" onClick={() => setProfileId(trainer.userId)}>View profile</Button>
        </div>
      </article>)}</div> : <EmptyState title="No trainers yet" detail="Create staff accounts here. Trainers cannot self-register." />}
    </>
  );
}
