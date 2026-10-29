import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, Pager, StatCard, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { openCashfreeCheckout } from "../../services/cashfree.js";
import { currency, dateLabel } from "../../utils/format.js";

export default function PaymentLedger({ clients, courses }) {
  const [paymentPage, setPaymentPage] = useState(1);
  const payments = useLoad(async () => responseData(await apiCalls.payments.list({ page: paymentPage })), [paymentPage]);
  const reminders = useLoad(async () => responseData(await apiCalls.payments.reminders()));
  const memberships = useLoad(async () => responseData(await apiCalls.memberships.list()));
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ clientId: "", membershipId: "", amount: "", paymentMethod: "upi", reference: "", reminderDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [voidingPaymentId, setVoidingPaymentId] = useState("");
  const [resolvingReminderId, setResolvingReminderId] = useState("");
  const [sendingReminderId, setSendingReminderId] = useState("");
  const [reminderLinks, setReminderLinks] = useState({});
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
      await Promise.all([payments.refresh(), reminders.refresh(), memberships.refresh()]);
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
  async function voidPayment(payment) {
    const reason = window.prompt("Why is this payment being voided?");
    if (!reason?.trim()) return;
    setVoidingPaymentId(payment.id);
    setError("");
    try {
      await apiCalls.payments.void(payment.id, reason.trim());
      await Promise.all([payments.refresh(), memberships.refresh()]);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to void this payment."));
    } finally {
      setVoidingPaymentId("");
    }
  }
  async function prepareReminder(reminder) {
    setSendingReminderId(reminder.paymentId);
    setError("");
    try {
      const result = responseData(await apiCalls.payments.sendReminder(reminder.paymentId));
      setReminderLinks((current) => ({ ...current, [reminder.paymentId]: result.whatsappUrl }));
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to prepare this reminder."));
    } finally {
      setSendingReminderId("");
    }
  }
  async function resolveReminder(reminder) {
    setResolvingReminderId(reminder.paymentId);
    setError("");
    try {
      await apiCalls.payments.resolveReminder(reminder.paymentId);
      await reminders.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to mark this reminder as resolved."));
    } finally {
      setResolvingReminderId("");
    }
  }
  if (payments.loading && !payments.data) return <LoadingState />;
  const rows = payments.data?.items ?? [];
  const total = rows.reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
  return (
    <>
      <PageHeader eyebrow={`${payments.data?.pagination?.total ?? rows.length} records`} title="Payments" description="Record and reconcile cash, UPI, and card collections." actions={<Button onClick={() => setFormOpen(!formOpen)}>{formOpen ? "Close form" : "＋ Record payment"}</Button>} />
      <Notice error={error || payments.error} />
      <Notice error={reminders.error} />
      <Notice error={memberships.error} />
      <div className="stat-grid stat-grid--3"><StatCard label="Recorded on this page" value={currency(total)} detail="Excludes voided payments" /><StatCard label="UPI / cash / card" value="Owner recorded" detail="Payment method is captured per transaction" tone="success" /><StatCard label="Active courses" value={courses.length} detail="Available for enrollment" /></div>
      {formOpen && <Card title="Record payment" eyebrow="Front desk"><form className="form-grid" onSubmit={submit}>
        <Field label="Client *"><select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value, membershipId: "" })}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.User?.fullName} · {client.User?.email}</option>)}</select></Field>
        <Field label="Membership"><select value={form.membershipId} onChange={(event) => {
          const membershipId = event.target.value;
          const membership = memberships.data?.find((item) => item.id === membershipId);
          const client = clients.find((item) => item.userId === membership?.clientId);
          const paid = (membership?.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
          setForm({
            ...form,
            membershipId,
            clientId: client?.id ?? form.clientId,
            amount: membership ? String(Math.max(0, Number(membership.totalAmount) - paid)) : form.amount,
          });
        }}><option value="">No membership</option>{(memberships.data ?? []).map((membership) => {
          const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
          const due = Math.max(0, Number(membership.totalAmount) - paid);
          if (!due || !["active", "pending_payment"].includes(membership.status)) return null;
          return <option key={membership.id} value={membership.id}>{membership.Member?.User?.fullName ?? "Member"} · {membership.Course?.name ?? "Course"} · due {currency(due)}</option>;
        })}</select></Field>
        <Field label="Amount (₹) *"><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
        <Field label="Method *"><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option></select></Field>
        <Field label="Reference"><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></Field>
        <Field label="Reminder date"><input type="date" value={form.reminderDate} onChange={(event) => setForm({ ...form, reminderDate: event.target.value })} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving || checkoutSaving}>{saving ? "Saving…" : "Save payment"}</Button><Button type="button" variant="outline" onClick={checkout} disabled={saving || checkoutSaving}>{checkoutSaving ? "Opening checkout…" : "Pay with Cashfree"}</Button></div>
      </form></Card>}
      {rows.length ? <Card title="Recent payments"><div className="table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Membership</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.dateTime)}</td><td>{payment.PaymentDetail?.Client?.User?.fullName ?? "Member"}</td><td>{payment.Membership?.Course?.name ?? "—"}</td><td><StatusPill tone="neutral">{payment.paymentMethod}</StatusPill></td><td>{payment.reference || "—"}</td><td className="money-cell">{currency(payment.amount)}</td><td><StatusPill tone={payment.voidedAt ? "warning" : "success"}>{payment.voidedAt ? "voided" : "recorded"}</StatusPill></td><td>{!payment.voidedAt && <Button variant="ghost" disabled={voidingPaymentId === payment.id} onClick={() => voidPayment(payment)}>{voidingPaymentId === payment.id ? "Voiding…" : "Void"}</Button>}</td></tr>)}</tbody></table></div><Pager pagination={payments.data?.pagination} onPage={setPaymentPage} disabled={payments.loading} /></Card> : <EmptyState title="No payments recorded" detail="Record a payment during enrollment or from this page." />}
      {reminders.data?.length ? <Card title="Payment reminders due" eyebrow="Reminder dates have passed"><div className="table-wrap"><table><thead><tr><th>Client</th><th>Due date</th><th>Amount</th><th>Method</th><th>Action</th></tr></thead><tbody>{reminders.data.map((item) => <tr key={item.paymentId}><td>{item.Client?.User?.fullName ?? "Member"}</td><td>{dateLabel(item.reminderDate)}</td><td>{currency(item.Payment?.amount)}</td><td>{item.Payment?.paymentMethod ?? "—"}</td><td><div className="row-actions">{reminderLinks[item.paymentId] ? <a className="button button--outline" href={reminderLinks[item.paymentId]} target="_blank" rel="noopener noreferrer">Open WhatsApp ↗</a> : <Button variant="outline" disabled={sendingReminderId === item.paymentId} onClick={() => prepareReminder(item)}>{sendingReminderId === item.paymentId ? "Preparing…" : "Send reminder"}</Button>}<Button variant="ghost" disabled={resolvingReminderId === item.paymentId} onClick={() => resolveReminder(item)}>{resolvingReminderId === item.paymentId ? "Resolving…" : "Mark resolved"}</Button></div></td></tr>)}</tbody></table></div><p className="muted">“Send reminder” prepares a WhatsApp message for you to send from your phone or WhatsApp Web. One reminder per member every 24 hours.</p></Card> : null}
    </>
  );
}
