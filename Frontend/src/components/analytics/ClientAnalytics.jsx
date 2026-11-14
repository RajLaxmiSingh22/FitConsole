import { useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatCard, StatusPill } from "../ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { currency, dateLabel } from "../../utils/format.js";
import { openSection } from "../../utils/navigationIntent.js";
import AttendanceCalendar from "./AttendanceCalendar.jsx";
import { BarChart, LineChart } from "./charts.jsx";
import LatestRecords from "./LatestRecords.jsx";
import WeeklyAttendance from "./WeeklyAttendance.jsx";
import WellnessForm from "./WellnessForm.jsx";

const RANGES = [30, 60, 90];
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const short = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const monthName = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
const goalLabels = { muscle_gain: "Muscle gain", fat_loss: "Fat loss", maintain: "Maintain" };

function TrainerNoteForm({ clientId, onSaved }) {
  const [kind, setKind] = useState("recommendation");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.clients.addTrainerNote(clientId, { kind, body });
      setBody("");
      onSaved();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save the note."));
    } finally {
      setSaving(false);
    }
  }
  return <form className="note-form" onSubmit={save}>
    <Notice error={error} />
    <div className="form-grid">
      <Field label="Type"><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="recommendation">Recommendation (client can see)</option><option value="note">Private note (staff only)</option></select></Field>
      <Field label="Note" className="field--wide"><textarea rows="3" required maxLength="2000" value={body} onChange={(event) => setBody(event.target.value)} /></Field>
      <div className="form-actions"><Button type="submit" disabled={saving || !body.trim()}>{saving ? "Saving…" : "Add note"}</Button></div>
    </div>
  </form>;
}

// One analytics page for every role; the server decides which records each viewer receives.
export default function ClientAnalytics({ clientId, viewerRole, onBack }) {
  const [range, setRange] = useState(30);
  const [period, setPeriod] = useState("weekly");
  const analytics = useLoad(async () => responseData(await apiCalls.clients.analytics(clientId, range)), [clientId, range]);
  const data = analytics.data;
  const staff = viewerRole === "owner" || viewerRole === "trainer";

  if (analytics.loading && !data) return <LoadingState label="Loading analytics…" />;
  if (!data) return <><PageHeader title="Analytics" /><Notice error={analytics.error || "Analytics are unavailable."} /></>;

  const a = data.attendance;
  const weekly = data.series.weekly.slice(-Math.ceil(range / 7)).map((row) => ({ key: row.week, label: `Week of ${short(row.week)}`, short: short(row.week), visits: row.visits, scheduled: row.scheduled }));
  const monthly = data.series.monthly.map((row) => ({ key: row.month, label: monthName(row.month), visits: row.visits, scheduled: row.scheduled }));
  const consistency = data.series.weekly.filter((row) => row.rate != null).slice(-Math.ceil(range / 7)).map((row) => ({ key: row.week, label: `Week of ${short(row.week)}`, short: short(row.week), rate: row.rate }));
  const weightRows = data.progress.entries.filter((row) => row.weightKg != null);
  const weights = weightRows.map((row) => ({ key: row.date, label: `${row.approximate ? "≈ " : ""}${short(row.date)}`, short: `${row.approximate ? "≈" : ""}${short(row.date)}`, weight: row.weightKg }));
  const target = data.profile?.targetWeightKg;
  const startWeight = weightRows[0]?.weightKg;
  const restrictions = data.profile?.dietRestrictions;
  const workout = data.profile?.workoutProfile;
  const measurements = data.progress.entries.filter((row) => row.waistCm || row.chestCm || row.armCm || row.hipsCm);
  const workouts = [...data.progress.entries].reverse().filter((row) => row.note || row.stamina).slice(0, 6);
  const wellness = data.wellness.filter((row) => row.date >= data.range.from).map((row) => ({ key: row.date, label: short(row.date), energy: row.energy, stress: row.stress, motivation: row.motivation }));
  const todayCheckin = data.wellness.find((row) => row.date === data.range.to);
  const latestWellness = data.wellness.at(-1);
  const painReports = data.wellness.filter((row) => row.pain).slice(-5).reverse();
  const firstWeight = weights[0]?.weight;
  const lastWeight = weights.at(-1)?.weight;

  return <div className="analytics">
    <PageHeader
      eyebrow={staff ? "Member analytics" : "Your progress"}
      title={staff ? data.client.name : "Attendance & progress"}
      description={`Training days: ${data.trainingDays.map((day) => dayNames[day - 1]).join(", ")}${data.usesDefaultTrainingDays ? " (default plan)" : ""}${data.membership ? ` · ${data.membership.course} until ${dateLabel(data.membership.endDate)}` : " · No active membership"}`}
      actions={<div className="analytics-actions">
        {onBack && <Button variant="ghost" onClick={onBack}>← Back</Button>}
        <div className="tt-filters" role="group" aria-label="Period">{RANGES.map((days) => <button key={days} type="button" className={range === days ? "is-active" : ""} aria-pressed={range === days} onClick={() => setRange(days)}>{days} days</button>)}</div>
      </div>}
    />
    <Notice error={analytics.error} />

    <Card title="Latest records" eyebrow="Newest first"><LatestRecords records={data.latest} /></Card>

    <section className="stat-grid stat-grid--4 analytics-stats" aria-label="Attendance overview">
      <StatCard label="Current streak" value={a.currentStreak} detail={`Longest ${a.longestStreak}`} tone="success" />
      <StatCard label="Attendance" value={a.attendancePercentage == null ? "—" : `${a.attendancePercentage}%`} detail={`${a.attendedScheduled} of ${a.scheduledSessions} planned sessions`} />
      <StatCard label="Visits" value={a.totalVisits} detail={`${a.averageVisitsPerWeek} per week · ${a.allTimeVisits} all time`} />
      <StatCard label="Missed sessions" value={a.missedSessions} detail={a.lastVisit ? `Last visit ${dateLabel(a.lastVisit)}` : "No visits yet"} tone={a.missedSessions ? "warning" : ""} />
    </section>
    <p className="muted analytics-first">First check-in {a.firstVisit ? dateLabel(a.firstVisit) : "—"} · Last check-in {a.lastVisit ? dateLabel(a.lastVisit) : "—"}</p>

    <div className="dashboard-grid">
      <Card title="Membership & payments" eyebrow={`${data.memberships.length} memberships · ${data.payments.length} payments`}>
        {data.memberships.length ? <ul className="history-list">{data.memberships.map((row) => {
          const paid = data.payments.filter((payment) => payment.membershipId === row.id && !payment.voided).reduce((sum, payment) => sum + payment.amount, 0);
          return <li key={row.id}><span><b>{row.course}</b><small>{dateLabel(row.startDate)} – {dateLabel(row.endDate)}</small></span><StatusPill tone={row.status === "active" ? "success" : row.status === "expired" ? "neutral" : "warning"}>{row.status.replace("_", " ")}</StatusPill><span className="history-amount">{currency(paid)} / {currency(row.totalAmount)}</span></li>;
        })}</ul> : <EmptyState title="No memberships yet" />}
        {data.payments.length > 0 && <table className="measure-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead><tbody>{data.payments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.paidAt)}</td><td>{currency(payment.amount)}</td><td>{payment.method.toUpperCase()}</td><td>{payment.voided ? "Voided" : payment.reference ?? "—"}</td></tr>)}</tbody></table>}
      </Card>
      <Card title="Coach" eyebrow="Assigned trainer">
        {data.trainer ? <div className="coach-card">
          <span className="avatar avatar--large">{data.trainer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <div><b>{data.trainer.name}</b><small>{data.trainer.certification ?? "Coach"}</small></div>
          {viewerRole === "owner" && <Button variant="outline" onClick={() => openSection("Trainers", { type: "trainer", id: data.trainer.id })}>View coach profile ↗</Button>}
        </div> : <EmptyState title="No coach assigned" />}
      </Card>
    </div>

    <div className="dashboard-grid">
      <Card title="This week" eyebrow="Planned vs attended"><WeeklyAttendance week={data.week} /></Card>
      <Card title="Insights" eyebrow="From your records">
        {data.insights.length ? <ul className="insights">{data.insights.map((text) => <li key={text}>{text}</li>)}</ul> : <EmptyState title="Not enough data yet" detail="Insights appear once there are a few weeks of visits and check-ins." />}
      </Card>
    </div>

    <div className="dashboard-grid analytics-grid">
      <Card title="Attendance calendar" eyebrow="Tap a day for times"><AttendanceCalendar clientId={clientId} /></Card>
      <Card title="Attendance trend" eyebrow={`Last ${range} days`} action={<div className="tt-filters" role="group" aria-label="Chart period">{[["weekly", "Weekly"], ["monthly", "Monthly"], ["consistency", "Consistency"]].map(([value, label]) => <button key={value} type="button" className={period === value ? "is-active" : ""} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div>}>
        {period === "weekly" && <BarChart data={weekly} value="visits" target="scheduled" label="Visits" targetLabel="Planned" ariaLabel="Visits per week compared with planned sessions" />}
        {period === "monthly" && <BarChart data={monthly} value="visits" target="scheduled" label="Visits" targetLabel="Planned" ariaLabel="Visits per month compared with planned sessions" />}
        {period === "consistency" && (consistency.length ? <LineChart data={consistency} series={[{ key: "rate", label: "Attendance %", color: "var(--viz-1)" }]} yDomain={[0, 100]} format={(v) => `${v}%`} ariaLabel="Weekly attendance rate" /> : <EmptyState title="No planned sessions in this period" />)}
      </Card>
    </div>

    <div className="dashboard-grid">
      <Card title="Weight" eyebrow={firstWeight != null && lastWeight != null ? `${firstWeight} → ${lastWeight} kg` : "Progress"}>
        {weights.length >= 2 ? <LineChart data={weights} series={[{ key: "weight", label: "Weight (kg)", color: "var(--viz-1)" }]} format={(v) => `${v} kg`} ariaLabel="Weight over time" /> : <EmptyState title="Not enough weigh-ins yet" detail="Log weight in a weekly progress check-in." />}
        <dl className="analytics-facts">
          <div><dt>Current weight</dt><dd>{data.progress.currentWeightKg ? `${data.progress.currentWeightKg} kg` : "—"}</dd></div>
          <div><dt>Target</dt><dd>{target ? `${target} kg` : "Not set"}</dd></div>
          <div><dt>To go</dt><dd>{target && data.progress.currentWeightKg ? `${Number((data.progress.currentWeightKg - target).toFixed(1))} kg` : "—"}</dd></div>
          <div><dt>Change since first record</dt><dd>{startWeight != null && data.progress.currentWeightKg ? `${data.progress.currentWeightKg - startWeight > 0 ? "+" : ""}${Number((data.progress.currentWeightKg - startWeight).toFixed(1))} kg` : "—"}</dd></div>
          <div><dt>Height</dt><dd>{data.progress.heightCm ? `${data.progress.heightCm} cm` : "—"}</dd></div>
          <div><dt>Goal</dt><dd>{goalLabels[data.progress.goalCategory] ?? "Not set"}</dd></div>
        </dl>
        {weightRows.length > 0 && <table className="measure-table weight-history"><thead><tr><th>Date</th><th>Weight</th><th>Context</th></tr></thead><tbody>{[...weightRows].reverse().map((row) => <tr key={`${row.date}-${row.weightKg}`}>
          <td>{row.approximate ? <span title="Approximate date: only the period is known">≈ {short(row.date)}</span> : short(row.date)}</td><td>{row.weightKg} kg</td><td>{row.context ?? "—"}</td>
        </tr>)}</tbody></table>}
        {weightRows.some((row) => row.approximate) && <p className="muted weight-footnote">≈ approximate date: only the month or week was known.</p>}
      </Card>
      <Card title="Workouts & measurements" eyebrow="Latest first">
        {workouts.length ? <ul className="workout-list">{workouts.map((row) => <li key={row.date}><time>{short(row.date)}</time><span>{row.note ?? "Workout logged"}</span>{row.stamina && <StatusPill tone="success">Stamina {row.stamina}/10</StatusPill>}</li>)}</ul> : <EmptyState title="No workouts logged yet" />}
        {measurements.length > 0 && <table className="measure-table"><thead><tr><th>Date</th><th>Waist</th><th>Chest</th><th>Arm</th><th>Hips</th></tr></thead><tbody>{[measurements[0], measurements.at(-1)].filter((row, index, rows) => index === 0 || row !== rows[0]).map((row, index) => <tr key={row.date}><td>{index === 0 ? "Start · " : "Latest · "}{short(row.date)}</td><td>{row.waistCm ?? "—"}</td><td>{row.chestCm ?? "—"}</td><td>{row.armCm ?? "—"}</td><td>{row.hipsCm ?? "—"}</td></tr>)}</tbody></table>}
      </Card>
    </div>

    <div className="dashboard-grid">
      <Card title="Health & nutrition" eyebrow="Self-reported · visible to you, your coach and the gym">
        <dl className="profile-facts">
          <div><dt>Health notes</dt><dd>{data.profile?.healthIssues ?? "None recorded"}{data.profile?.injuries ? ` · ${data.profile.injuries}` : ""}</dd></div>
          <div><dt>Allergies</dt><dd>{data.profile?.allergies?.length ? data.profile.allergies.join(", ") : "None recorded"}</dd></div>
        </dl>
        {restrictions?.active ? <div className="restrictions">
          <b>Temporary diet restrictions</b>
          <p className="muted">{restrictions.source ?? "Reported by the member"}{restrictions.expectedDuration ? ` · about ${restrictions.expectedDuration}` : ""}{restrictions.since ? ` · since ${dateLabel(restrictions.since)}` : ""}</p>
          <div className="tag-list">{restrictions.avoid.map((item) => <StatusPill key={item} tone="danger">✕ {item}</StatusPill>)}</div>
          {restrictions.suitable?.length > 0 && <><p className="muted">Suitable options reported:</p><div className="tag-list">{restrictions.suitable.map((item) => <StatusPill key={item} tone="success">✓ {item}</StatusPill>)}</div></>}
          {restrictions.reviewOn && <p className={`restriction-review ${restrictions.reviewOn <= data.range.to ? "is-due" : ""}`}>{restrictions.reviewOn <= data.range.to ? "Review due" : "Review on"} {dateLabel(restrictions.reviewOn)}. Restrictions stay until the member confirms a change.</p>}
          {restrictions.notes && <p className="muted">{restrictions.notes}</p>}
        </div> : <p className="muted">No temporary diet restrictions.</p>}
      </Card>
      <Card title="Workout profile" eyebrow="Preferences and sessions">
        <dl className="profile-facts">
          <div><dt>Workout types</dt><dd>{workout?.types?.length ? workout.types.join(", ") : "Not set"}</dd></div>
          <div><dt>Usual duration</dt><dd>{workout?.minutesMin ? `${workout.minutesMin}${workout.minutesMax && workout.minutesMax !== workout.minutesMin ? `–${workout.minutesMax}` : ""} minutes` : "Not set"}</dd></div>
        </dl>
        {workout?.notes && <p className="muted">{workout.notes}</p>}
        {data.sessionsByCourse.length ? <ul className="history-list">{data.sessionsByCourse.map((row) => <li key={row.course}><span><b>{row.course}</b><small>{row.inRange} in the last {range} days</small></span><span /><span className="history-amount">{row.allTime} sessions</span></li>)}</ul> : <EmptyState title="No sessions recorded yet" detail="Sessions appear here when you check in at the gym." />}
      </Card>
    </div>

    <div className="dashboard-grid analytics-grid">
      <Card title="Wellness trends" eyebrow={latestWellness ? `Latest: ${latestWellness.mood}, energy ${latestWellness.energy}/5` : "Mood, energy and stress"}>
        {wellness.length >= 2 ? <LineChart data={wellness} series={[{ key: "energy", label: "Energy", color: "var(--viz-1)" }, { key: "stress", label: "Stress", color: "var(--viz-2)" }, { key: "motivation", label: "Motivation", color: "var(--viz-3)" }]} yDomain={[1, 5]} format={(v) => `${v}/5`} ariaLabel="Energy, stress and motivation over time" /> : <EmptyState title="No wellness check-ins yet" detail={staff ? "The member hasn't logged any yet." : "Add your first check-in to see trends."} />}
        {staff && painReports.length > 0 && <div className="pain-reports"><b>Pain or injury reported</b>{painReports.map((row) => <p key={row.date}><time>{short(row.date)}</time> {row.problem || "No description"}</p>)}</div>}
      </Card>
      {staff
        ? <Card title="Trainer notes" eyebrow="Private notes and recommendations">
          <TrainerNoteForm clientId={clientId} onSaved={analytics.refresh} />
          {data.notes.length ? <ul className="note-list">{data.notes.map((note) => <li key={note.id}><StatusPill tone={note.kind === "recommendation" ? "success" : "neutral"}>{note.kind === "recommendation" ? "Recommendation" : "Private"}</StatusPill><p>{note.body}</p><small>{note.author} · {dateLabel(note.createdAt)}</small></li>)}</ul> : <EmptyState title="No notes yet" />}
        </Card>
        : <Card title={todayCheckin ? "Update today's check-in" : "Today's wellness check-in"} eyebrow="Takes 30 seconds">
          <WellnessForm clientId={clientId} today={todayCheckin ? { ...todayCheckin, sleepHours: todayCheckin.sleepHours ?? "", problem: todayCheckin.problem ?? "", notes: todayCheckin.notes ?? "" } : undefined} onSaved={analytics.refresh} />
          {data.notes.length > 0 && <div className="coach-recs"><b>From your coach</b>{data.notes.map((note) => <p key={note.id}>{note.body} <small>— {note.author}, {dateLabel(note.createdAt)}</small></p>)}</div>}
        </Card>}
    </div>
  </div>;
}
