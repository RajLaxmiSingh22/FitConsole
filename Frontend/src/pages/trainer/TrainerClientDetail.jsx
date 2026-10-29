import { useEffect, useState } from "react";
import DietPlanView from "../../components/DietPlanView.jsx";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatCard, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel } from "../../utils/format.js";
import PlanDraftEditor from "./PlanDraftEditor.jsx";

export default function TrainerClientDetail({ client, user, onBack, onMessage }) {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editingPlan, setEditingPlan] = useState("");
  const [expandedPlan, setExpandedPlan] = useState("");
  const [notice, setNotice] = useState("");
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
  async function checkIn() {
    setBusy("attendance");
    setError("");
    setNotice("");
    try {
      await apiCalls.attendance.checkIn({ clientId: client.id, courseId });
      setNotice("Check-in recorded.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record attendance."));
    } finally {
      setBusy("");
    }
  }
  async function suggestTweak(planId) {
    setBusy(`tweak-${planId}`);
    setError("");
    setNotice("");
    try {
      await apiCalls.clients.suggestDietTweak(client.id, planId);
      setNotice("A revised draft was created from the last four weeks of progress. Review it before approving.");
      await refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to suggest a plan tweak."));
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
    <Notice tone="success" error={notice} />
    <div className="stat-grid stat-grid--4">
      <StatCard label="Latest weight" value={summary?.latestWeightKg ? `${summary.latestWeightKg} kg` : "—"} detail={summary?.latestRecordedOn ? `Logged ${dateLabel(summary.latestRecordedOn)}` : "No weight entry yet"} />
      <StatCard label="2-week change" value={summary?.weightChangeOverTwoWeeksKg == null ? "—" : `${summary.weightChangeOverTwoWeeksKg > 0 ? "+" : ""}${summary.weightChangeOverTwoWeeksKg} kg`} detail="Based on available check-ins" tone={summary?.weightChangeOverTwoWeeksKg <= 0 ? "success" : "warning"} />
      <StatCard label="Diet check-ins" value={entries.length} detail="Progress entries recorded" />
      <StatCard label="Plans to review" value={plans.filter((plan) => plan.status === "draft").length} detail="Draft plans awaiting approval" tone="danger" />
    </div>
    <Card title="Attendance" eyebrow="Today's check-in">
      <div className="form-grid">
        <Field label="Course *">
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            <option value="">Select an assigned course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </Field>
        <div className="form-actions">
          <Button onClick={checkIn} disabled={!courseId || busy === "attendance"}>
            {busy === "attendance" ? "Checking in…" : "Check in client"}
          </Button>
        </div>
      </div>
      <p className="muted">Attendance requires a valid membership and current waiver. Duplicate same-day check-ins are rejected.</p>
    </Card>
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
            <div className="row-actions">
              <Button variant="ghost" onClick={() => setExpandedPlan(expandedPlan === plan.id ? "" : plan.id)}>{expandedPlan === plan.id ? "Hide" : "View"}</Button>
              {plan.status === "draft" && <><Button variant="outline" onClick={() => setEditingPlan(editingPlan === plan.id ? "" : plan.id)}>Edit</Button><Button onClick={() => approvePlan(plan.id)} disabled={busy === plan.id}>{busy === plan.id ? "Approving…" : "Approve"}</Button></>}
              {plan.status === "approved" && <Button variant="outline" onClick={() => suggestTweak(plan.id)} disabled={busy === `tweak-${plan.id}`}>{busy === `tweak-${plan.id}` ? "Drafting…" : "Suggest weekly tweak"}</Button>}
            </div>
          </div>
          {expandedPlan === plan.id && <DietPlanView plan={plan.plan} />}
          {editingPlan === plan.id && <PlanDraftEditor plan={plan} saving={busy === plan.id} onSave={(content) => savePlan(plan.id, content)} onCancel={() => setEditingPlan("")} />}
        </article>)}</div> : <EmptyState title="No plans yet" detail="Generate a draft plan for this client. Review it before sharing." />}
      </Card>
    </div>
    <Card title="Diet tracker log" eyebrow="Member check-ins">
      {entries.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Sleep</th><th>Hunger</th><th>Mood</th><th>Calories</th><th>Water</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{dateLabel(entry.recordedOn)}</td><td>{entry.weightKg ? `${entry.weightKg} kg` : "—"}</td><td>{entry.sleepDurationHours ? `${entry.sleepDurationHours} h` : "—"}</td><td>{entry.hunger || "—"}</td><td>{entry.mood || "—"}</td><td>{entry.calories ?? "—"}</td><td>{entry.waterLiters ? `${entry.waterLiters} L` : "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No check-ins from this client yet" />}
    </Card>
  </>;
}
