import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader } from "../../../components/ui/index.js";
import { leadName, leadStatuses } from "../../../constants/leads.js";
import { apiCalls, getApiError, responseData } from "../../../services/api.js";
import { labelize } from "../../../utils/format.js";

export default function WebsiteLeads() {
  const [filters, setFilters] = useState({ search: "", status: "", courseId: "", from: "", to: "", sort: "createdAt", order: "desc" });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [reload, setReload] = useState(0);
  const [list, setList] = useState({ loading: true, error: "", leads: [], pagination: {}, counts: {} });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [courseOptions, setCourseOptions] = useState([]);
  useEffect(() => {
    apiCalls.courses.list().then((response) => setCourseOptions(responseData(response) ?? [])).catch(() => setCourseOptions([]));
  }, []);
  useEffect(() => {
    let active = true;
    setList((current) => ({ ...current, loading: true, error: "" }));
    apiCalls.leads.list({ ...filters, search: filters.search || undefined, status: filters.status || undefined, courseId: filters.courseId || undefined, from: filters.from || undefined, to: filters.to || undefined, page, limit })
      .then((response) => {
        if (!active) return;
        const data = responseData(response) ?? {};
        setList({ loading: false, error: "", leads: Array.isArray(data) ? data : data.leads ?? [], pagination: data.pagination ?? {}, counts: data.counts ?? {} });
      })
      .catch((error) => { if (active) setList((current) => ({ ...current, loading: false, error: getApiError(error) })); });
    return () => { active = false; };
  }, [filters, page, limit, reload]);
  async function openLead(id) {
    setSelectedId(id);
    setDetail(null);
    setStatus("");
    setCourseId("");
    setActionError("");
    setActionMessage("");
    try { setDetail(responseData(await apiCalls.leads.get(id))); }
    catch (error) { setActionError(getApiError(error)); }
  }
  async function updateLead(action) {
    if (!selectedId) return;
    setBusy(true);
    setActionError("");
    try {
      if (action === "note") {
        if (!note.trim()) return;
        await apiCalls.leads.addNote(selectedId, note.trim());
        setNote("");
      } else {
        const nextStatus = status.trim() || selectedLead?.status;
        if (!nextStatus) return;
        await apiCalls.leads.setStatus(selectedId, nextStatus, statusNote.trim() || undefined);
        setStatusNote("");
      }
      await openLead(selectedId);
      setReload((value) => value + 1);
    } catch (error) { setActionError(getApiError(error)); }
    finally { setBusy(false); }
  }
  const pageCount = Number(list.pagination.totalPages ?? list.pagination.pages ?? 1);
  const selectedLead = detail?.lead ?? detail;
  const notes = selectedLead?.LeadActivities ?? selectedLead?.activities ?? selectedLead?.notes ?? detail?.notes ?? [];
  async function assignCourse() {
    if (!selectedId || !courseId) return;
    setBusy(true);
    setActionError("");
    setActionMessage("");
    try {
      await apiCalls.leads.assignCourse(selectedId, courseId);
      await openLead(selectedId);
      setReload((value) => value + 1);
      setActionMessage("Course assigned.");
    } catch (error) { setActionError(getApiError(error)); }
    finally { setBusy(false); }
  }
  async function enrollLead() {
    if (!selectedId) return;
    setBusy(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = responseData(await apiCalls.leads.enroll(selectedId, durationMonths));
      await openLead(selectedId);
      setReload((value) => value + 1);
      setActionMessage(`Enrolled successfully. Payment status: ${response?.paymentStatus ?? "unpaid"}.`);
    } catch (error) { setActionError(getApiError(error)); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader eyebrow="PUBLIC WEBSITE" title="Website leads" description="Review trial requests submitted through your public website." />
    <Notice error={list.error} />
    <Card title="Lead inbox" eyebrow={`${list.leads.length} on this page`}>
      <div className="toolbar website-lead-filters">
        <Field label="Search"><input value={filters.search} placeholder="Name, phone, email" onChange={(event) => { setFilters({ ...filters, search: event.target.value }); setPage(1); }} /></Field>
        <Field label="Status"><input value={filters.status} placeholder="Any status" onChange={(event) => { setFilters({ ...filters, status: event.target.value }); setPage(1); }} /></Field>
        <Field label="Program"><select value={filters.courseId} onChange={(event) => { setFilters({ ...filters, courseId: event.target.value }); setPage(1); }}><option value="">All programs</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
        <Field label="From"><input type="date" value={filters.from} onChange={(event) => { setFilters({ ...filters, from: event.target.value }); setPage(1); }} /></Field>
        <Field label="To"><input type="date" value={filters.to} onChange={(event) => { setFilters({ ...filters, to: event.target.value }); setPage(1); }} /></Field>
        <Field label="Sort by"><select value={filters.sort} onChange={(event) => { setFilters({ ...filters, sort: event.target.value }); setPage(1); }}><option value="createdAt">Date received</option><option value="name">Name</option><option value="status">Status</option></select></Field>
        <Field label="Sort order"><select value={filters.order} onChange={(event) => { setFilters({ ...filters, order: event.target.value }); setPage(1); }}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></Field>
      </div>
      {Object.keys(list.counts).length > 0 && <div className="website-counts">{Object.entries(list.counts).map(([name, count]) => <span key={name}><b>{count}</b> {labelize(name)}</span>)}</div>}
      {list.loading && !list.leads.length ? <LoadingState label="Loading leads…" /> : list.leads.length ? <>
        <div className="website-lead-list">{list.leads.map((lead) => <button key={lead.id} className={`website-lead-row ${selectedId === lead.id ? "is-selected" : ""}`} onClick={() => openLead(lead.id)}>
          <span><b>{leadName(lead)}</b><small>{lead.phone ?? lead.email ?? "Contact details not provided"}</small></span>
          <span>{lead.Course?.name ?? lead.course?.name ?? lead.courseName ?? "Program not selected"}</span>
          <span className="status-pill status-pill--neutral">{lead.status ?? "Status not set"}</span>
        </button>)}</div>
        <div className="website-pagination"><span>Page {page} of {pageCount}{list.pagination.total != null ? ` · ${list.pagination.total} leads` : ""}</span><div><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
      </> : !list.loading && <EmptyState title="No website leads" detail="Trial requests received through the website will appear here." />}
    </Card>
    {selectedId && <Card title={selectedLead ? leadName(selectedLead) : "Lead details"} eyebrow="Lead details" className="website-lead-detail">
      <Notice error={actionError} />
      {actionMessage && <p className="muted" role="status">{actionMessage}</p>}
      {!detail ? <LoadingState label="Loading lead…" /> : <>
        <div className="website-lead-facts">{Object.entries({
          Phone: selectedLead?.phone, Email: selectedLead?.email,
          Program: selectedLead?.Course?.name ?? selectedLead?.course?.name ?? selectedLead?.courseName,
          "Preferred date": selectedLead?.preferredDate, "Preferred time": selectedLead?.preferredSlot,
          Source: selectedLead?.source, "Landing page": selectedLead?.landingPage,
          "UTM source": selectedLead?.utmSource, "UTM medium": selectedLead?.utmMedium, "UTM campaign": selectedLead?.utmCampaign,
          Message: selectedLead?.message,
        }).filter(([, value]) => value != null && value !== "").map(([name, value]) => <div key={name}><small>{name}</small><b>{String(value)}</b></div>)}</div>
        <Field label="Set status"><select value={status || selectedLead?.status || "new"} onChange={(event) => setStatus(event.target.value)}>{leadStatuses.map((value) => <option key={value} value={value} disabled={value === "enrolled"}>{labelize(value)}</option>)}</select></Field>
        <Field label="Status note (optional)"><input value={statusNote} onChange={(event) => setStatusNote(event.target.value)} /></Field>
        <Button disabled={busy || !(status.trim() || selectedLead?.status) || (status.trim() || selectedLead?.status) === selectedLead?.status} onClick={() => updateLead("status")}>Update status</Button>
        {selectedLead?.status !== "enrolled" && <div className="website-course-assignment">
          <Field label="Assign active course"><select value={courseId || selectedLead?.courseId || ""} onChange={(event) => setCourseId(event.target.value)}><option value="">Choose a course</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
          <Button variant="outline" disabled={busy || !(courseId || selectedLead?.courseId)} onClick={assignCourse}>Assign course</Button>
        </div>}
        {selectedLead?.status === "trial_attended" && <div className="website-enrollment">
          <Field label="Membership duration"><select value={durationMonths} onChange={(event) => setDurationMonths(Number(event.target.value))}>{[1, 3, 6, 12].map((months) => <option key={months} value={months}>{months} months</option>)}</select></Field>
          <Button disabled={busy || !selectedLead?.courseId} onClick={enrollLead}>Enroll existing member</Button>
          <small>Requires an existing member account matching this lead's phone or email. Enrollment does not record payment.</small>
        </div>}
        <div className="website-note-form"><Field label="Add note"><textarea rows="2" value={note} onChange={(event) => setNote(event.target.value)} /></Field><Button variant="outline" disabled={busy || !note.trim()} onClick={() => updateLead("note")}>Add note</Button></div>
        <div className="website-notes"><h3>Activity and notes</h3>{notes.length ? notes.map((item, index) => <p key={item.id ?? index}>{typeof item === "string" ? item : item.description ?? item.note ?? item.body ?? "Activity"}<small>{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ""}</small></p>) : <p className="muted">No activity yet.</p>}</div>
      </>}
    </Card>}
  </>;
}
