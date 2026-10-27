import { useEffect, useMemo, useState } from "react";
import { apiCalls, getApiError } from "../api.js";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LoadingState,
  Notice,
  PageHeader,
  StatCard,
  StatusPill,
  dateLabel,
  initials,
  responseData,
} from "../components/ui.jsx";
import MessageWorkspace from "./MessageWorkspace.jsx";

function TrainerHome({ onSelectClient }) {
  const [data, setData] = useState({ clients: [], stats: null, loading: true, error: "" });
  const [search, setSearch] = useState("");
  useEffect(() => {
    Promise.all([apiCalls.trainers.clients(), apiCalls.dashboard.trainer()])
      .then(([clientResponse, dashboardResponse]) => setData({
        clients: responseData(clientResponse) ?? [],
        stats: responseData(dashboardResponse),
        loading: false,
        error: "",
      }))
      .catch((error) => setData((current) => ({ ...current, loading: false, error: getApiError(error) })));
  }, []);
  const filtered = useMemo(() => data.clients.filter((client) => client.User?.fullName?.toLowerCase().includes(search.toLowerCase())), [data.clients, search]);
  if (data.loading) return <LoadingState label="Loading your roster…" />;
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} title="Good evening, coach" description="Your assigned roster and member progress, all in one place." />
    <Notice error={data.error} />
    <div className="stat-grid stat-grid--3">
      <StatCard label="My clients" value={data.stats?.clients ?? data.clients.length} detail="Assigned to your coaching roster" />
      <StatCard label="Active memberships" value={data.stats?.activeMembers ?? "—"} detail="Members currently training" tone="success" />
      <StatCard label="Check-ins this week" value={data.stats?.attendanceThisWeek ?? "—"} detail="Attendance records this week" tone="warning" />
    </div>
    <Card title="My clients" eyebrow="Coaching roster" action={<Field label="Search"><input type="search" placeholder="Search clients" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>}>
      {filtered.length ? <div className="client-card-grid">{filtered.map((client) => <button className="client-preview" key={client.id} onClick={() => onSelectClient(client)}>
        <div className="person-cell"><span className="avatar">{initials(client.User?.fullName)}</span><span><b>{client.User?.fullName ?? "Client"}</b><small>{client.goal || "Goal not set"}</small></span><span className="arrow">↗</span></div>
        <div className="preview-meta"><span>{client.phone || client.User?.email || "No contact info"}</span><StatusPill tone="primary">View progress</StatusPill></div>
      </button>)}</div> : <EmptyState title="No assigned clients" detail="Clients assigned to your trainer profile will show up here." />}
    </Card>
  </>;
}

function PlanDraftEditor({ plan, saving, onSave, onCancel }) {
  const [content, setContent] = useState(JSON.stringify(plan.plan ?? {}, null, 2));
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const parsed = JSON.parse(content);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setError("Plan content must be a JSON object.");
        return;
      }
      await onSave(parsed);
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? "Enter valid JSON before saving." : getApiError(requestError, "Unable to save the draft."));
    }
  }
  return <form className="plan-editor" onSubmit={submit}>
    <Field label="Draft plan JSON"><textarea rows="9" value={content} onChange={(event) => setContent(event.target.value)} spellCheck="false" /></Field>
    {error && <p className="inline-error">{error}</p>}
    <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save draft"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>;
}

function TrainerClientDetail({ client, user, onBack, onMessage }) {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editingPlan, setEditingPlan] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, entriesResponse, plansResponse, coursesResponse] = await Promise.all([
        apiCalls.clients.dietSummary(client.id),
        apiCalls.clients.dietEntries(client.id),
        apiCalls.clients.dietPlans(client.id),
        apiCalls.courses.list(),
      ]);
      setSummary(responseData(summaryResponse));
      setEntries(responseData(entriesResponse) ?? []);
      setPlans(responseData(plansResponse) ?? []);
      setCourses((responseData(coursesResponse) ?? []).filter((course) =>
        course.Trainers?.some((trainer) => trainer.userId === user.id),
      ));
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load this client's progress."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, [client.id, user.id]);

  async function generatePlan() {
    setBusy("generate");
    setError("");
    try {
      await apiCalls.clients.generateDietPlan(client.id, courseId ? { courseId } : {});
      await refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to generate a diet plan."));
    } finally {
      setBusy("");
    }
  }
  async function approvePlan(id) {
    setBusy(id);
    setError("");
    try {
      await apiCalls.dietPlans.approve(id);
      await refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to approve this plan."));
    } finally {
      setBusy("");
    }
  }
  async function savePlan(id, plan) {
    setBusy(id);
    setError("");
    try {
      await apiCalls.dietPlans.update(id, plan);
      setEditingPlan("");
      await refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save diet plan."));
    } finally {
      setBusy("");
    }
  }
  if (loading) return <LoadingState label="Loading client progress…" />;
  return <>
    <button className="back-link" onClick={onBack}>← My clients</button>
    <PageHeader eyebrow="Assigned client" title={client.User?.fullName ?? "Member"} description={`${client.goal ? `Goal: ${client.goal}` : "Goal not set"} · ${client.phone || client.User?.email || "No contact information"}`} actions={<Button variant="outline" onClick={() => onMessage(client)}>Message</Button>} />
    <Notice error={error} />
    <div className="stat-grid stat-grid--4">
      <StatCard label="Latest weight" value={summary?.latestWeightKg ? `${summary.latestWeightKg} kg` : "—"} detail={summary?.latestRecordedOn ? `Logged ${dateLabel(summary.latestRecordedOn)}` : "No weight entry yet"} />
      <StatCard label="2-week change" value={summary?.weightChangeOverTwoWeeksKg == null ? "—" : `${summary.weightChangeOverTwoWeeksKg > 0 ? "+" : ""}${summary.weightChangeOverTwoWeeksKg} kg`} detail="Based on available check-ins" tone={summary?.weightChangeOverTwoWeeksKg <= 0 ? "success" : "warning"} />
      <StatCard label="Diet check-ins" value={entries.length} detail="Progress entries recorded" />
      <StatCard label="Plans to review" value={plans.filter((plan) => plan.status === "draft").length} detail="Draft plans awaiting approval" tone="danger" />
    </div>
    <Card title="Generate a diet plan" eyebrow="Gemini draft">
      <p className="muted">Create a draft for this client. Select an assigned course to tailor the plan, or use general fitness.</p>
      <div className="form-grid">
        <Field label="Course">
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="">General fitness</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </Field>
        <div className="form-actions">
          <Button onClick={generatePlan} disabled={busy === "generate"}>
            {busy === "generate" ? "Generating…" : "✳ Generate AI plan"}
          </Button>
        </div>
      </div>
    </Card>
    <div className="dashboard-grid">
      <Card title="Weight trend" eyebrow="Every two weeks">
        {summary?.history?.length ? <div className="weight-chart">{[...summary.history].reverse().map((entry, index, rows) => {
          const weights = rows.map((row) => Number(row.weightKg)).filter(Boolean);
          const min = Math.min(...weights), max = Math.max(...weights);
          const height = max === min ? 62 : 36 + ((Number(entry.weightKg) - min) / (max - min)) * 88;
          return <div className="weight-bar" key={entry.id}><b>{entry.weightKg} kg</b><span style={{ height }} /><small>{dateLabel(entry.recordedOn, { day: "numeric", month: "short" })}</small></div>;
        })}</div> : <EmptyState title="No weight history yet" detail="Weight measurements will appear when a client logs check-ins." />}
      </Card>
      <Card title="Diet plans" eyebrow="Trainer review">
        {plans.length ? <div className="plan-list">{plans.map((plan) => <article className="plan-review-row" key={plan.id}>
          <div className="plan-row">
            <div><b>{plan.plan?.title || "Trainer diet plan"}</b><small>{plan.courseId ? courses.find((course) => course.id === plan.courseId)?.name ?? "Course plan" : "General fitness"} · Created {dateLabel(plan.createdAt)}</small></div>
            <StatusPill tone={plan.status === "approved" ? "success" : "danger"}>{plan.status}</StatusPill>
            {plan.status === "draft" && <div className="row-actions"><Button variant="outline" onClick={() => setEditingPlan(editingPlan === plan.id ? "" : plan.id)}>Edit</Button><Button onClick={() => approvePlan(plan.id)} disabled={busy === plan.id}>{busy === plan.id ? "Approving…" : "Approve"}</Button></div>}
          </div>
          {editingPlan === plan.id && <PlanDraftEditor plan={plan} saving={busy === plan.id} onSave={(content) => savePlan(plan.id, content)} onCancel={() => setEditingPlan("")} />}
        </article>)}</div> : <EmptyState title="No plans yet" detail="Generate a draft plan for this client. Review it before sharing." />}
      </Card>
    </div>
    <Card title="Diet tracker log" eyebrow="Member check-ins">
      {entries.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Hunger</th><th>Mood</th><th>Calories</th><th>Water</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{dateLabel(entry.recordedOn)}</td><td>{entry.weightKg ? `${entry.weightKg} kg` : "—"}</td><td>{entry.sleepDurationHours ? `${entry.sleepDurationHours} h` : "—"}</td><td>{entry.hunger || "—"}</td><td>{entry.mood || "—"}</td><td>{entry.calories ?? "—"}</td><td>{entry.waterLiters ? `${entry.waterLiters} L` : "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No check-ins from this client yet" />}
    </Card>
  </>;
}

function TrainerPlanReview({ clients }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editingPlan, setEditingPlan] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const lists = await Promise.all(clients.map(async (client) => {
        const rows = responseData(await apiCalls.clients.dietPlans(client.id)) ?? [];
        return rows.map((plan) => ({ ...plan, clientName: client.User?.fullName ?? "Client" }));
      }));
      setPlans(lists.flat());
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to retrieve diet plans."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [clients]);
  async function approve(planId) {
    setBusy(planId);
    try {
      await apiCalls.dietPlans.approve(planId);
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to approve diet plan."));
    } finally {
      setBusy("");
    }
  }
  async function savePlan(planId, content) {
    setBusy(planId);
    setError("");
    try {
      await apiCalls.dietPlans.update(planId, content);
      setEditingPlan("");
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save diet plan."));
    } finally {
      setBusy("");
    }
  }
  if (loading) return <LoadingState label="Gathering client plans…" />;
  const drafts = plans.filter((plan) => plan.status === "draft");
  return <>
    <PageHeader eyebrow={`${drafts.length} drafts`} title="Diet plans" description="Review generated drafts before clients can see the approved plan." />
    <Notice error={error} />
    {drafts.length ? <div className="plan-grid">{drafts.map((plan) => <Card key={plan.id} title={plan.plan?.title || "Diet plan draft"} eyebrow={plan.clientName}>
      {editingPlan === plan.id ? <PlanDraftEditor plan={plan} saving={busy === plan.id} onSave={(content) => savePlan(plan.id, content)} onCancel={() => setEditingPlan("")} /> : <pre className="plan-preview">{JSON.stringify(plan.plan, null, 2)}</pre>}
      {editingPlan !== plan.id && <div className="row-actions"><Button variant="outline" onClick={() => setEditingPlan(plan.id)}>Edit draft</Button><Button onClick={() => approve(plan.id)} disabled={busy === plan.id}>{busy === plan.id ? "Approving…" : "Approve & send"}</Button></div>}
    </Card>)}</div> : <EmptyState title="Nothing to review" detail="Generated diet-plan drafts will appear here." />}
  </>;
}

function TrainerProfile({ user }) {
  const [profile, setProfile] = useState({ phone: "", certification: "", experienceYears: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiCalls.trainers.get(user.id).then((response) => {
      const trainer = responseData(response);
      setProfile({ phone: trainer.phone ?? "", certification: trainer.certification ?? "", experienceYears: trainer.experienceYears ?? "" });
    }).catch((requestError) => setError(getApiError(requestError)));
  }, [user.id]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiCalls.trainers.updateMe({ ...profile, experienceYears: profile.experienceYears === "" ? null : Number(profile.experienceYears) });
      setMessage("Trainer profile saved.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save profile."));
    } finally {
      setSaving(false);
    }
  }
  return <>
    <PageHeader eyebrow="Coach profile" title={user.fullName} description="Keep your public-facing trainer profile current." />
    <Notice error={error} /><Notice error={message} />
    <Card title="Trainer details"><form className="form-grid" onSubmit={save}>
      <Field label="Name"><input value={user.fullName} disabled /></Field>
      <Field label="Email"><input value={user.email} disabled /></Field>
      <Field label="Phone"><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></Field>
      <Field label="Certification"><input value={profile.certification} onChange={(event) => setProfile({ ...profile, certification: event.target.value })} /></Field>
      <Field label="Experience (years)"><input type="number" min="0" step="0.1" value={profile.experienceYears} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} /></Field>
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
    </form></Card>
  </>;
}

export default function TrainerWorkspace({ section, user, selectedClient, onSelectClient, onNavigate }) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    apiCalls.trainers.clients().then((response) => setClients(responseData(response) ?? [])).catch(() => setClients([]));
  }, []);
  if (section === "Dashboard") return <TrainerHome onSelectClient={onSelectClient} />;
  if (section === "Progress" && selectedClient) return <TrainerClientDetail client={selectedClient} user={user} onBack={() => onNavigate("My clients")} onMessage={() => onNavigate("Messages")} />;
  if (section === "Progress" || section === "My clients") return <TrainerHome onSelectClient={onSelectClient} />;
  if (section === "Diet plans") return <TrainerPlanReview clients={clients} />;
  if (section === "Profile") return <TrainerProfile user={user} />;
  if (section === "Messages") return <MessageWorkspace currentUserId={user.id} contacts={clients.map((client) => ({ id: client.userId, name: client.User?.fullName ?? "Client", role: "client" }))} />;
  return <EmptyState title="No selected client" detail="Choose a client from your roster to review progress." />;
}
