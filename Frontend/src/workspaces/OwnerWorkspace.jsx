import { useCallback, useEffect, useMemo, useState } from "react";
import { apiCalls, getApiError } from "../api.js";
import { openCashfreeCheckout } from "../cashfree.js";
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
  currency,
  dateLabel,
  initials,
  responseData,
} from "../components/ui.jsx";

const durations = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
];

function useLoad(loader, dependencies = []) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loader();
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getApiError(error) }));
    }
  // The caller controls refetching through its dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}

function DownloadButton({ label, download }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const response = await download();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = label.match(/(?:clients|payments)\.xlsx/i)?.[0] ?? "fitconsole-report.xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to download report."));
    } finally {
      setBusy(false);
    }
  }
  return <><Button variant="outline" onClick={handleDownload} disabled={busy}>{busy ? "Preparing…" : label}</Button>{error && <span className="inline-error">{error}</span>}</>;
}

function OwnerDashboard() {
  const dashboard = useLoad(async () => responseData(await apiCalls.dashboard.owner()));
  const data = dashboard.data ?? {};
  if (dashboard.loading && !dashboard.data) return <LoadingState />;
  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        title="Command center"
        description="A live view of memberships, collections, and renewals across your gym."
        actions={<DownloadButton label="Export payments.xlsx" download={apiCalls.exports.payments} />}
      />
      <Notice error={dashboard.error} />
      <div className="stat-grid stat-grid--4">
        <StatCard label="Revenue this month" value={currency(data.revenueThisMonth)} detail="Payments recorded this month" />
        <StatCard label="Active members" value={data.activeMembers ?? "—"} detail="Current active memberships" tone="success" />
        <StatCard label="Expiring soon" value={data.expiringSoon?.length ?? "—"} detail="Renewals in the next 15 days" tone="warning" />
        <StatCard label="Pending dues" value={currency(data.outstandingDues)} detail="Calculated from active plans" tone="danger" />
      </div>
      <div className="dashboard-grid">
        <Card title="Renewals & dues" eyebrow="Needs attention" action={<Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Clients" }))}>View clients ↗</Button>}>
          {data.expiringSoon?.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Member</th><th>Membership ends</th><th>Status</th></tr></thead>
                <tbody>{data.expiringSoon.map((membership) => (
                  <tr key={membership.id}>
                    <td>{membership.Member?.User?.fullName ?? "Member"}</td>
                    <td>{dateLabel(membership.endDate)}</td>
                    <td><StatusPill tone="warning">Renewal due</StatusPill></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <EmptyState title="No renewals due soon" detail="Memberships ending in the next 15 days will appear here." />}
        </Card>
        <Card title="Quick actions" eyebrow="Front desk">
          <div className="quick-actions">
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Clients" }))}><span className="quick-icon">＋</span><span><b>Add a client</b><small>Create a member profile</small></span></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Payments" }))}><span className="quick-icon">₹</span><span><b>Record payment</b><small>Log cash, UPI, or card</small></span></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Attendance" }))}><span className="quick-icon">✓</span><span><b>Check in a member</b><small>Record today's attendance</small></span></button>
          </div>
        </Card>
      </div>
    </>
  );
}

function ClientCreateForm({ trainers, onCreated, onCancel }) {
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
        <Field label="Temporary password *"><input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Emergency contact"><input value={form.emergencyContactPhone} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} /></Field>
        <Field label="Goal"><input value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></Field>
        <Field label="Assign trainer"><select value={form.trainerId ?? ""} onChange={(event) => setForm({ ...form, trainerId: event.target.value })}><option value="">Unassigned</option>{trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName}</option>)}</select></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create client"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
      </form>
    </Card>
  );
}

function ClientRoster({ clients, trainers, onRefresh }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState({});
  const filtered = useMemo(() => clients.filter((client) => {
    const name = client.User?.fullName ?? "";
    const email = client.User?.email ?? "";
    return `${name} ${email} ${client.phone ?? ""}`.toLowerCase().includes(search.toLowerCase());
  }), [clients, search]);

  async function assign(clientId, trainerId) {
    setError("");
    try {
      await apiCalls.clients.assignTrainer(clientId, trainerId || null);
      onRefresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to assign trainer."));
    }
  }

  return (
    <>
      <PageHeader eyebrow={`${clients.length} member profiles`} title="Clients" description="Member profiles, health goals, and trainer assignments." actions={<DownloadButton label="Export clients.xlsx" download={apiCalls.exports.clients} />} />
      <Notice error={error} />
      <Card className="roster-card">
        <div className="toolbar">
          <Field label="Search clients"><input type="search" placeholder="Search by name, email, or phone" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ Add client"}</Button>
        </div>
        {showForm && <ClientCreateForm trainers={trainers} onCreated={() => { setShowForm(false); onRefresh(); }} onCancel={() => setShowForm(false)} />}
        {filtered.length ? <div className="table-wrap"><table>
          <thead><tr><th>Client</th><th>Phone</th><th>Goal</th><th>Joined</th><th>Assigned trainer</th></tr></thead>
          <tbody>{filtered.map((client) => <tr key={client.id}>
            <td><div className="person-cell"><span className="avatar">{initials(client.User?.fullName)}</span><span><b>{client.User?.fullName ?? "New client"}</b><small>{client.User?.email}</small></span></div></td>
            <td>{client.phone || "—"}</td>
            <td>{client.goal || "—"}</td>
            <td>{dateLabel(client.joinedAt)}</td>
            <td><select className="table-select" value={assignments[client.id] ?? trainers.find((trainer) => trainer.id === client.trainerId)?.userId ?? ""} onChange={(event) => { setAssignments({ ...assignments, [client.id]: event.target.value }); assign(client.id, event.target.value); }}><option value="">Unassigned</option>{trainers.map((trainer) => <option key={trainer.userId} value={trainer.userId}>{trainer.User?.fullName}</option>)}</select></td>
          </tr>)}</tbody>
        </table></div> : <EmptyState title="No clients found" detail={search ? "Try changing your search." : "Create a client profile to get started."} />}
      </Card>
    </>
  );
}

function CourseCatalog({ courses, trainers, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("combat");
  const [description, setDescription] = useState("");
  const [prices, setPrices] = useState({ 1: "", 3: "", 6: "", 12: "" });
  const [trainerSelection, setTrainerSelection] = useState({});
  const [editingPrices, setEditingPrices] = useState("");
  const [coursePrices, setCoursePrices] = useState({});
  const [pricingError, setPricingError] = useState("");
  const [savingPrices, setSavingPrices] = useState(false);
  async function createCourse(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const plans = durations.filter(({ months }) => prices[months] !== "").map(({ months }) => ({ durationMonths: months, price: Number(prices[months]) }));
      await apiCalls.courses.create({ name, category, description, plans });
      setShowForm(false);
      setName("");
      setPrices({ 1: "", 3: "", 6: "", 12: "" });
      refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to create course."));
    } finally {
      setSaving(false);
    }
  }
  async function toggleTrainer(course, trainerUserId, checked) {
    const oldIds = trainerSelection[course.id] ?? course.Trainers?.map((item) => item.userId) ?? [];
    const next = checked ? [...oldIds, trainerUserId] : oldIds.filter((id) => id !== trainerUserId);
    setTrainerSelection({ ...trainerSelection, [course.id]: next });
    try {
      await apiCalls.courses.setTrainers(course.id, next);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update teaching trainers."));
      setTrainerSelection({ ...trainerSelection, [course.id]: oldIds });
    }
  }
  async function deactivate(course) {
    if (!window.confirm(`Deactivate ${course.name}?`)) return;
    try {
      await apiCalls.courses.deactivate(course.id);
      refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to deactivate course."));
    }
  }
  function startPriceEdit(course) {
    setPricingError("");
    setEditingPrices(course.id);
    setCoursePrices(Object.fromEntries(durations.map(({ months }) => [
      months,
      course.CoursePlans?.find((plan) => Number(plan.durationMonths) === months)?.price ?? "",
    ])));
  }
  async function saveCoursePrices(course) {
    const plans = durations
      .filter(({ months }) => coursePrices[months] !== "")
      .map(({ months }) => ({ durationMonths: months, price: Number(coursePrices[months]) }));
    if (!plans.length || plans.some((plan) => !Number.isFinite(plan.price) || plan.price <= 0)) {
      setPricingError("Enter a price greater than zero for at least one duration.");
      return;
    }
    setSavingPrices(true);
    setPricingError("");
    try {
      await apiCalls.courses.update(course.id, { plans });
      setEditingPrices("");
      refresh();
    } catch (requestError) {
      setPricingError(getApiError(requestError, "Unable to update course pricing."));
    } finally {
      setSavingPrices(false);
    }
  }
  return (
    <>
      <PageHeader eyebrow={`${courses.length} active courses`} title="Courses & pricing" description="Create member offers, set prices for each membership duration, and manage teaching staff. Active offers appear in the client Membership workspace." actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "＋ New course"}</Button>} />
      <Notice error={error} />
      <Notice error={pricingError} />
      {showForm && <Card title="Create course" eyebrow="Course setup"><form className="form-grid" onSubmit={createCourse}>
        <Field label="Course name *"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Category *"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="combat">Combat</option><option value="strength">Strength</option><option value="conditioning">Conditioning</option><option value="wellness">Wellness</option><option value="combo">Combo</option></select></Field>
        <Field label="Description"><input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        {durations.map(({ months, label }) => <Field label={`${label} price (₹)${months === 1 ? " *" : ""}`} key={months}><input type="number" min="1" step="0.01" required={months === 1} value={prices[months]} onChange={(event) => setPrices({ ...prices, [months]: event.target.value })} /></Field>)}
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save course"}</Button></div>
      </form></Card>}
      {courses.length ? <div className="course-grid">{courses.map((course) => {
        const assigned = trainerSelection[course.id] ?? course.Trainers?.map((trainer) => trainer.userId) ?? [];
        return <Card key={course.id} className="course-card">
          <div className="course-top"><StatusPill tone="primary">{course.category}</StatusPill><button className="text-button danger-text" onClick={() => deactivate(course)}>Deactivate</button></div>
          <h2>{course.name}</h2><p className="muted">{course.description || "Membership program"}</p>
          <div className="price-grid">{durations.map(({ months, label }) => { const plan = course.CoursePlans?.find((item) => Number(item.durationMonths) === months); return <div key={months}><small>{label}</small><b>{plan ? currency(plan.price) : "—"}</b></div>; })}</div>
          {editingPrices === course.id ? <div className="form-grid">
            {durations.map(({ months, label }) => <Field key={months} label={`${label} price (₹)`}><input type="number" min="0.01" step="0.01" value={coursePrices[months] ?? ""} onChange={(event) => setCoursePrices({ ...coursePrices, [months]: event.target.value })} /></Field>)}
            <div className="form-actions"><Button onClick={() => saveCoursePrices(course)} disabled={savingPrices}>{savingPrices ? "Saving…" : "Publish offers"}</Button><Button variant="outline" onClick={() => setEditingPrices("")}>Cancel</Button></div>
          </div> : <Button variant="outline" onClick={() => startPriceEdit(course)}>Edit member offers</Button>}
          <div className="trainer-assignment"><p className="overline">Teaching trainers</p>{trainers.map((trainer) => <label key={trainer.userId}><input type="checkbox" checked={assigned.includes(trainer.userId)} onChange={(event) => toggleTrainer(course, trainer.userId, event.target.checked)} />{trainer.User?.fullName}</label>)}</div>
        </Card>;
      })}</div> : <EmptyState title="No courses yet" detail="Add courses and membership prices to start enrolling members." />}
    </>
  );
}

function TrainerDirectory({ trainers, onRefresh }) {
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
        <Field label="Temporary password *"><input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
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

function PaymentLedger({ clients, courses }) {
  const payments = useLoad(async () => responseData(await apiCalls.payments.list()));
  const reminders = useLoad(async () => responseData(await apiCalls.payments.reminders()));
  const memberships = useLoad(async () => responseData(await apiCalls.memberships.list({ status: "active" })));
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ clientId: "", membershipId: "", amount: "", paymentMethod: "upi", reference: "", reminderDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  useEffect(() => {
    const refresh = () => Promise.all([payments.refresh(), reminders.refresh(), memberships.refresh()]);
    window.addEventListener("fitconsole:payment-confirmed", refresh);
    return () => window.removeEventListener("fitconsole:payment-confirmed", refresh);
  }, [payments.refresh, reminders.refresh, memberships.refresh]);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.payments.create({
        ...form,
        amount: Number(form.amount),
        membershipId: form.membershipId || null,
        reminderDate: form.reminderDate || null,
      });
      setForm({ clientId: "", membershipId: "", amount: "", paymentMethod: "upi", reference: "", reminderDate: "" });
      setFormOpen(false);
      await Promise.all([payments.refresh(), memberships.refresh()]);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record payment."));
    } finally {
      setSaving(false);
    }
  }
  async function checkout() {
    setError("");
    if (!form.clientId || !form.amount || Number(form.amount) <= 0) {
      setError("Select a client and enter a valid amount before starting checkout.");
      return;
    }
    setCheckoutSaving(true);
    try {
      const result = responseData(await apiCalls.payments.createCashfreeOrder({
        clientId: form.clientId,
        membershipId: form.membershipId || undefined,
        amount: Number(form.amount),
        reminderDate: form.reminderDate || null,
      }));
      await openCashfreeCheckout(result.paymentSessionId);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to start Cashfree checkout."));
    } finally {
      setCheckoutSaving(false);
    }
  }
  if (payments.loading && !payments.data) return <LoadingState />;
  const rows = payments.data ?? [];
  const total = rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return (
    <>
      <PageHeader eyebrow={`${rows.length} records`} title="Payments" description="Record and reconcile cash, UPI, and card collections." actions={<Button onClick={() => setFormOpen(!formOpen)}>{formOpen ? "Close form" : "＋ Record payment"}</Button>} />
      <Notice error={error || payments.error} />
      <Notice error={reminders.error} />
      <Notice error={memberships.error} />
      <div className="stat-grid stat-grid--3"><StatCard label="Total recorded" value={currency(total)} detail="All returned payment records" /><StatCard label="UPI / cash / card" value="Owner recorded" detail="Payment method is captured per transaction" tone="success" /><StatCard label="Active courses" value={courses.length} detail="Available for enrollment" /></div>
      {formOpen && <Card title="Record payment" eyebrow="Front desk"><form className="form-grid" onSubmit={submit}>
        <Field label="Client *"><select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, membershipId: "" })}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.User?.fullName} · {client.User?.email}</option>)}</select></Field>
        <Field label="Active membership"><select value={form.membershipId} onChange={(event) => {
          const membershipId = event.target.value;
          const membership = memberships.data?.find((item) => item.id === membershipId);
          const client = clients.find((item) => item.userId === membership?.clientId);
          const paid = (membership?.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          setForm({
            ...form,
            membershipId,
            clientId: client?.id ?? form.clientId,
            amount: membership ? String(Math.max(0, Number(membership.totalAmount) - paid)) : form.amount,
          });
        }}><option value="">No membership</option>{(memberships.data ?? []).map((membership) => {
          const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          const due = Math.max(0, Number(membership.totalAmount) - paid);
          if (!due) return null;
          return <option key={membership.id} value={membership.id}>{membership.Member?.User?.fullName ?? "Member"} · {membership.Course?.name ?? "Course"} · due {currency(due)}</option>;
        })}</select></Field>
        <Field label="Amount (₹) *"><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
        <Field label="Method *"><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option></select></Field>
        <Field label="Reference"><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></Field>
        <Field label="Reminder date"><input type="date" value={form.reminderDate} onChange={(event) => setForm({ ...form, reminderDate: event.target.value })} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving || checkoutSaving}>{saving ? "Saving…" : "Save payment"}</Button><Button type="button" variant="outline" onClick={checkout} disabled={saving || checkoutSaving}>{checkoutSaving ? "Opening checkout…" : "Pay with Cashfree"}</Button></div>
      </form></Card>}
      {rows.length ? <Card title="Recent payments"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Membership</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{rows.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.dateTime)}</td><td>{payment.PaymentDetail?.Client?.User?.fullName ?? "Member"}</td><td>{payment.Membership?.Course?.name ?? "—"}</td><td><StatusPill tone="neutral">{payment.paymentMethod}</StatusPill></td><td>{payment.reference || "—"}</td><td className="money-cell">{currency(payment.amount)}</td></tr>)}</tbody></table></div></Card> : <EmptyState title="No payments recorded" detail="Record a payment during enrollment or from this page." />}
      {reminders.data?.length ? <Card title="Payment reminders due" eyebrow="Reminder dates have passed"><div className="table-wrap"><table><thead><tr><th>Client</th><th>Due date</th><th>Amount</th><th>Method</th></tr></thead><tbody>{reminders.data.map((item) => <tr key={item.id}><td>{item.Client?.User?.fullName ?? "Member"}</td><td>{dateLabel(item.reminderDate)}</td><td>{currency(item.Payment?.amount)}</td><td>{item.Payment?.paymentMethod ?? "—"}</td></tr>)}</tbody></table></div><p className="muted">These are records to follow up on; FitConsole does not send reminders.</p></Card> : null}
    </>
  );
}

function AttendanceDesk({ clients, courses }) {
  const records = useLoad(async () => responseData(await apiCalls.attendance.list()));
  const [clientId, setClientId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCalls.attendance.checkIn({ clientId, courseId });
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
      <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Checking in…" : "Check in"}</Button></div>
    </form></Card>
    <Card title="Recent check-ins" eyebrow="Attendance log"><div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Checked in</th></tr></thead><tbody>{(records.data ?? []).map((record) => <tr key={record.id}><td>{record.Member?.User?.fullName ?? "Member"}</td><td>{record.Course?.name ?? "—"}</td><td>{dateLabel(record.attendedAt, { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</td></tr>)}</tbody></table></div></Card>
  </>;
}

function Reports() {
  return <>
    <PageHeader eyebrow="Business exports" title="Reports" description="Download spreadsheets generated from the live FitConsole records." />
    <div className="report-grid">
      <Card title="Client directory" eyebrow="Member data"><p className="muted">Names, contact details, assigned trainer, goal, and join date.</p><DownloadButton label="Download clients.xlsx" download={apiCalls.exports.clients} /></Card>
      <Card title="Payment ledger" eyebrow="Collections"><p className="muted">Recorded payment dates, amounts, methods, and membership references.</p><DownloadButton label="Download payments.xlsx" download={apiCalls.exports.payments} /></Card>
    </div>
  </>;
}

function MembershipDesk({ clients, courses }) {
  const [status, setStatus] = useState("");
  const memberships = useLoad(
    async () => responseData(await apiCalls.memberships.list(status ? { status } : {})),
    [status],
  );
  const [form, setForm] = useState({ clientId: "", courseId: "", durationMonths: "", paymentMethod: "", reference: "", recordPayment: false });
  const [error, setError] = useState("");
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
    try {
      if (action === "renew") await apiCalls.memberships.renew(id);
      else await apiCalls.memberships.cancel(id);
      await memberships.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, `Unable to ${action} membership.`));
    }
  }
  if (memberships.loading && !memberships.data) return <LoadingState />;
  return <>
    <PageHeader eyebrow={`${memberships.data?.length ?? 0} memberships`} title="Memberships" description="Enroll members in course plans and manage renewals from one place." />
    <Notice error={error || memberships.error} />
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
    <Card title="Membership register" eyebrow="Status & renewals" action={<Field label="Filter"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="expired">Expired</option></select></Field>}>
      {memberships.data?.length ? <div className="table-wrap"><table><thead><tr><th>Member</th><th>Course</th><th>Start</th><th>End</th><th>Amount</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>{memberships.data.map((membership) => {
        const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return <tr key={membership.id}>
        <td>{membership.Member?.User?.fullName ?? "Member"}</td><td>{membership.Course?.name ?? "—"}</td><td>{dateLabel(membership.startDate)}</td><td>{dateLabel(membership.endDate)}</td><td>{currency(membership.totalAmount)}</td>
        <td>{currency(paid)}{paid < Number(membership.totalAmount) ? <small className="muted"> · due {currency(Number(membership.totalAmount) - paid)}</small> : null}</td>
        <td><StatusPill tone={membership.status === "active" ? "success" : membership.status === "expired" ? "warning" : "neutral"}>{membership.status}</StatusPill></td>
        <td><div className="row-actions">{membership.status !== "cancelled" && <Button variant="outline" onClick={() => updateMembership(membership.id, "renew")}>Renew</Button>}{membership.status === "active" && <Button variant="ghost" onClick={() => updateMembership(membership.id, "cancel")}>Cancel</Button>}</div></td>
      </tr>;
      })}</tbody></table></div> : <EmptyState title="No memberships found" detail="Enroll a client to add the first membership." />}
    </Card>
  </>;
}

export default function OwnerWorkspace({ section }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const clients = useLoad(async () => responseData(await apiCalls.clients.list()), [refreshKey]);
  const trainers = useLoad(async () => responseData(await apiCalls.trainers.list()), [refreshKey]);
  const courses = useLoad(async () => responseData(await apiCalls.courses.list()), [refreshKey]);
  const refresh = () => setRefreshKey((value) => value + 1);
  const clientRows = clients.data ?? [];
  const trainerRows = trainers.data ?? [];
  const courseRows = courses.data ?? [];
  if (section === "Dashboard") return <OwnerDashboard />;
  if (section === "Clients") {
    if (clients.loading && !clients.data) return <LoadingState />;
    return <><Notice error={clients.error} /><ClientRoster clients={clientRows} trainers={trainerRows} onRefresh={refresh} /></>;
  }
  if (section === "Courses") {
    if (courses.loading && !courses.data) return <LoadingState />;
    return <><Notice error={courses.error} /><CourseCatalog courses={courseRows} trainers={trainerRows} refresh={refresh} /></>;
  }
  if (section === "Memberships") {
    if (clients.loading && !clients.data || courses.loading && !courses.data) return <LoadingState />;
    return <><Notice error={clients.error || courses.error} /><MembershipDesk clients={clientRows} courses={courseRows} /></>;
  }
  if (section === "Trainers") {
    if (trainers.loading && !trainers.data) return <LoadingState />;
    return <><Notice error={trainers.error} /><TrainerDirectory trainers={trainerRows} onRefresh={refresh} /></>;
  }
  if (section === "Payments") return <PaymentLedger clients={clientRows} courses={courseRows} />;
  if (section === "Attendance") return <AttendanceDesk clients={clientRows} courses={courseRows} />;
  if (section === "Reports") return <Reports />;
  return <EmptyState title={`${section} is coming next`} detail="This workspace section will connect to the matching API workflow." />;
}
