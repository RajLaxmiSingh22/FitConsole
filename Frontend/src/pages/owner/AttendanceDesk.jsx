import { useState } from "react";
import { Button, Card, Field, LoadingState, Notice, PageHeader, Pager, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel } from "../../utils/format.js";

export default function AttendanceDesk({ clients, courses }) {
  const [page, setPage] = useState(1);
  const records = useLoad(async () => responseData(await apiCalls.attendance.list({ page })), [page]);
  const [clientId, setClientId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.attendance.checkIn({ clientId, courseId, ...(override ? { override: true, reason } : {}) });
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
    <PageHeader eyebrow="Front desk" title="Attendance" description="Check members into today's training session." />
    <Notice error={error || records.error} />
    <Card title="Check in a member" eyebrow="New attendance"><form className="form-grid" onSubmit={submit}>
      <Field label="Client *"><select required value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.User?.fullName}</option>)}</select></Field>
      <Field label="Course *"><select required value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
      <label className="checkbox-field"><input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} /><span>Override missing active membership</span></label>
      {override && <Field label="Override reason *"><input required minLength="1" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>}
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Checking in…" : "Check in"}</Button></div>
    </form></Card>
    <Card title="Recent check-ins" eyebrow="Attendance log"><div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Status</th><th>Override reason</th><th>Time</th></tr></thead><tbody>{(records.data?.items ?? []).map((record) => <tr key={record.id}><td>{record.Member?.User?.fullName ?? "Member"}</td><td>{record.Course?.name ?? "—"}</td><td>{record.override ? <StatusPill tone="warning">Override</StatusPill> : <StatusPill tone="success">Valid membership</StatusPill>}</td><td>{record.overrideReason || "—"}</td><td>{dateLabel(record.attendedAt, { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</td></tr>)}</tbody></table></div><Pager pagination={records.data?.pagination} onPage={setPage} disabled={records.loading} /></Card>
  </>;
}
