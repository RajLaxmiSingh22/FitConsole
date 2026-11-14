import { useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, Pager, StatusPill } from "../../components/ui/index.js";
import { timeLabel, todayWeekday } from "../../constants/schedule.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel } from "../../utils/format.js";
import ClassSchedule from "./ClassSchedule.jsx";

const tabs = [["checkin", "Check-in"], ["schedule", "Class schedule"]];

export default function AttendanceDesk({ clients, courses, trainers }) {
  const [tab, setTab] = useState("checkin");
  return <>
    <PageHeader eyebrow="Front desk" title="Attendance" description="Check members in, and manage the weekly class timetable shown on the website." />
    <div className="desk-tabs" role="tablist" aria-label="Attendance sections">
      {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}
    </div>
    {tab === "checkin"
      ? <CheckInDesk clients={clients} courses={courses} trainers={trainers} />
      : <ClassSchedule courses={courses} trainers={trainers} embedded />}
  </>;
}

function CheckInDesk({ clients, courses, trainers }) {
  const [page, setPage] = useState(1);
  const records = useLoad(async () => responseData(await apiCalls.attendance.list({ page })), [page]);
  const schedule = useLoad(async () => responseData(await apiCalls.schedule.list()));
  const today = todayWeekday();
  const todaysClasses = (schedule.data ?? []).filter((session) => session.weekday === today);
  const [clientId, setClientId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Picking one of today's classes fills in its course and trainer.
  function pickClass(session) {
    setSessionId(session.id);
    setCourseId(session.course.id);
    setTrainerId(session.trainer?.id ?? "");
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiCalls.attendance.checkIn({ clientId, courseId, trainerId: trainerId || null, ...(override ? { override: true, reason } : {}) });
      const member = clients.find((client) => client.id === clientId)?.User?.fullName ?? "Member";
      setNotice(`${member} is checked in.`);
      // Keep the class selected so the next member in the same class is one pick away.
      setClientId("");
      setOverride(false);
      setReason("");
      await records.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record check-in."));
    } finally {
      setSaving(false);
    }
  }
  if (records.loading && !records.data) return <LoadingState />;
  return <>
    <Notice error={error || records.error} />
    <Notice tone="success" error={notice} />
    <Card title="Check in a member" eyebrow="New attendance">
      {todaysClasses.length > 0 && <div className="desk-today">
        <p className="overline">TODAY'S CLASSES · TAP TO SELECT</p>
        <div className="desk-today-list">{todaysClasses.map((session) => <button key={session.id} type="button" aria-pressed={sessionId === session.id} className={sessionId === session.id ? "is-active" : ""} onClick={() => pickClass(session)}>
          <span>{timeLabel(session.startTime)} – {timeLabel(session.endTime)}</span>
          <b>{session.course.name}</b>
          <small>{session.trainer?.name ?? "No trainer listed"}</small>
        </button>)}</div>
      </div>}
      <form className="form-grid" onSubmit={submit}>
        <Field label="Client *"><select required value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.User?.fullName}</option>)}</select></Field>
        <Field label="Course *"><select required value={courseId} onChange={(event) => { setCourseId(event.target.value); setSessionId(""); }}><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
        <Field label="Trainer"><select value={trainerId} onChange={(event) => { setTrainerId(event.target.value); setSessionId(""); }}><option value="">Not recorded</option>{trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName ?? "Trainer"}</option>)}</select></Field>
        <label className="checkbox-field"><input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} /><span>Override missing active membership</span></label>
        {override && <Field label="Override reason *" className="field--wide"><input required minLength="1" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>}
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Checking in…" : "Check in"}</Button></div>
      </form>
    </Card>
    <Card title="Recent check-ins" eyebrow="Attendance log">
      {(records.data?.items ?? []).length ? <div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Trainer</th><th>Status</th><th>Override reason</th><th>Time</th></tr></thead><tbody>{records.data.items.map((record) => <tr key={record.id}>
        <td>{record.Member?.User?.fullName ?? "Member"}</td>
        <td>{record.Course?.name ?? "—"}</td>
        <td>{record.Trainer?.User?.fullName ?? "—"}</td>
        <td>{record.override ? <StatusPill tone="warning">Override</StatusPill> : <StatusPill tone="success">Valid membership</StatusPill>}</td>
        <td>{record.overrideReason || "—"}</td>
        <td>{dateLabel(record.attendedAt, { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</td>
      </tr>)}</tbody></table></div> : <EmptyState title="No check-ins yet" detail="Members you check in appear here." />}
      <Pager pagination={records.data?.pagination} onPage={setPage} disabled={records.loading} />
    </Card>
  </>;
}
