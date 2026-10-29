import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, Pager, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { currency, dateLabel } from "../../utils/format.js";

export default function MembershipDesk({ clients, courses }) {
  const [status, setStatus] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const memberships = useLoad(
    async () => responseData(await apiCalls.memberships.list({
      page,
      status: status || undefined,
      courseId: courseFilter || undefined,
      search: search || undefined,
    })),
    [status, courseFilter, search, page],
  );

  // Wait for typing to pause before searching on the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const membershipRows = memberships.data?.items ?? [];
  const [form, setForm] = useState({ clientId: "", courseId: "", durationMonths: "", paymentMethod: "", reference: "", recordPayment: false });
  const [error, setError] = useState("");
  const [renewalNotice, setRenewalNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedCourse = courses.find((course) => course.id === form.courseId);
  const availablePlans = selectedCourse?.CoursePlans ?? [];

  async function enroll(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.memberships.create({
        clientId: form.clientId,
        courseId: form.courseId,
        durationMonths: Number(form.durationMonths),
        ...(form.recordPayment ? { paymentMethod: form.paymentMethod, reference: form.reference } : {}),
      });
      setForm({ clientId: "", courseId: "", durationMonths: "", paymentMethod: "", reference: "", recordPayment: false });
      await Promise.all([memberships.refresh()]);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to create membership."));
    } finally {
      setSaving(false);
    }
  }
  async function updateMembership(id, action) {
    setError("");
    setRenewalNotice("");
    try {
      if (action === "renew") {
        const renewed = responseData(await apiCalls.memberships.renew(id));
        setRenewalNotice(`Renewal created. ${currency(renewed.dueAmount ?? renewed.totalAmount)} is due for the new membership.`);
      } else {
        await apiCalls.memberships.cancel(id);
      }
      await memberships.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, `Unable to ${action} membership.`));
    }
  }
  if (memberships.loading && !memberships.data) return <LoadingState />;
  return <>
    <PageHeader eyebrow={`${memberships.data?.pagination?.total ?? 0} memberships`} title="Memberships" description="Enroll members in course plans and manage renewals from one place." />
    <Notice error={error || memberships.error} />
    <Notice tone="success" error={renewalNotice} />
    <Card title="Enroll a client" eyebrow="New membership">
      <form className="form-grid" onSubmit={enroll}>
        <Field label="Client *"><select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Choose a member</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.User?.fullName} · {client.User?.email}</option>)}</select></Field>
        <Field label="Course *"><select required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, durationMonths: "" })}><option value="">Choose a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field>
        <Field label="Plan duration *"><select required disabled={!availablePlans.length} value={form.durationMonths} onChange={(event) => setForm({ ...form, durationMonths: event.target.value })}><option value="">Choose a plan</option>{availablePlans.map((plan) => <option key={plan.id} value={plan.durationMonths}>{plan.durationMonths} months · {currency(plan.price)}</option>)}</select></Field>
        {!availablePlans.length && form.courseId && <p className="inline-error">This course has no active pricing plans.</p>}
        {form.recordPayment && <>
          <Field label="Payment method *"><select required value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="">Choose payment method</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option></select></Field>
          <Field label="Payment reference"><input value={form.reference} maxLength="255" onChange={(event) => setForm({ ...form, reference: event.target.value })} /></Field>
        </>}
        <label className="checkbox-field"><input type="checkbox" checked={form.recordPayment} onChange={(event) => setForm({ ...form, recordPayment: event.target.checked, paymentMethod: event.target.checked ? form.paymentMethod : "" })} /><span>Record a payment now (only if payment has been collected). Otherwise, record it later from Payments.</span></label>
        <div className="form-actions"><Button type="submit" disabled={saving || !availablePlans.length}>{saving ? "Enrolling…" : "Create membership"}</Button></div>
      </form>
    </Card>
    <Card title="Membership register" eyebrow="Status & renewals" action={<div className="toolbar"><Field label="Member"><input type="search" placeholder="Name or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></Field><Field label="Course"><select value={courseFilter} onChange={(event) => { setCourseFilter(event.target.value); setPage(1); }}><option value="">All courses</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></Field><Field label="Status"><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="active">Active</option><option value="pending_payment">Awaiting payment</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></Field></div>}>
      {membershipRows.length ? <><div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Start</th><th>End</th><th>Amount</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{membershipRows.map((membership) => {
        const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
        return <tr key={membership.id}>
        <td>{membership.Member?.User?.fullName ?? "Member"}</td><td>{membership.Course?.name ?? "—"}</td><td>{dateLabel(membership.startDate)}</td><td>{dateLabel(membership.endDate)}</td><td>{currency(membership.totalAmount)}</td>
        <td>{currency(paid)}{paid < Number(membership.totalAmount) ? <small className="muted"> · due {currency(Number(membership.totalAmount) - paid)}</small> : null}</td>
        <td><StatusPill tone={membership.status === "active" ? "success" : membership.status === "pending_payment" || membership.status === "expired" ? "warning" : "neutral"}>{membership.status.replaceAll("_", " ")}</StatusPill></td>
        <td><div className="row-actions">{membership.status !== "cancelled" && <Button variant="outline" onClick={() => updateMembership(membership.id, "renew")}>Renew</Button>}{membership.status === "active" && <Button variant="ghost" onClick={() => updateMembership(membership.id, "cancel")}>Cancel</Button>}</div></td>
      </tr>;
      })}</tbody></table></div><Pager pagination={memberships.data?.pagination} onPage={setPage} disabled={memberships.loading} /></> : <EmptyState title="No memberships found" detail="Enroll a client to add the first membership." />}
    </Card>
  </>;
}
