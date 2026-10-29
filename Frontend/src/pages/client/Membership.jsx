import { useState } from "react";
import { Button, Card, EmptyState, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { openCashfreeCheckout } from "../../services/cashfree.js";
import { currency, dateLabel } from "../../utils/format.js";

export default function Membership({ courses, memberships, payments, waiver, waivers, onWaiverAccepted, onRefresh }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkoutMembershipId, setCheckoutMembershipId] = useState("");
  const [checkoutOfferId, setCheckoutOfferId] = useState("");
  const [acceptance, setAcceptance] = useState(false);
  const currentVersion = waiver?.version ?? "1";
  const alreadyAccepted = acceptance || waivers.some((item) => item.agreementVersion === String(currentVersion));
  async function accept() {
    setSaving(true);
    setError("");
    try {
      await apiCalls.waivers.accept(null);
      setAcceptance(true);
      onWaiverAccepted();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record waiver acceptance."));
    } finally {
      setSaving(false);
    }
  }
  async function checkout(membershipId) {
    setCheckoutMembershipId(membershipId);
    setError("");
    try {
      const result = responseData(await apiCalls.payments.createCashfreeOrder({ membershipId }));
      await openCashfreeCheckout(result.paymentSessionId);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to start Cashfree checkout."));
    } finally {
      setCheckoutMembershipId("");
    }
  }
  async function checkoutOffer(course, plan) {
    const offerId = `${course.id}-${plan.durationMonths}`;
    setCheckoutOfferId(offerId);
    setError("");
    let membershipCreated = false;
    try {
      const membership = responseData(await apiCalls.memberships.createClientCheckout({
        courseId: course.id,
        durationMonths: Number(plan.durationMonths),
      }));
      membershipCreated = true;
      const order = responseData(await apiCalls.payments.createCashfreeOrder({ membershipId: membership.id }));
      await onRefresh();
      await openCashfreeCheckout(order.paymentSessionId);
    } catch (requestError) {
      if (membershipCreated) {
        await onRefresh();
        setError(`${getApiError(requestError, "Unable to start Cashfree checkout.")} Your membership is saved; use its payment button below to try again.`);
      } else {
        setError(getApiError(requestError, "Unable to start this course offer."));
      }
    } finally {
      setCheckoutOfferId("");
    }
  }
  const unpaidCourses = new Set(memberships.filter((membership) => {
    if (!["active", "pending_payment"].includes(membership.status)) return false;
    const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
    return paid < Number(membership.totalAmount);
  }).map((membership) => membership.courseId));
  return <>
    <PageHeader eyebrow="Account" title="Membership & payments" description="Your membership, payment history, and current gym agreement." />
    <Notice error={error} />
    <Card title="Courses & offers" eyebrow="Plans set by your gym">
      {courses.length ? <div className="course-grid">{courses.map((course) => (
        <article className="panel course-card" key={course.id}>
          <div className="course-top"><StatusPill tone="primary">{course.category}</StatusPill><span className="overline">AVAILABLE OFFER</span></div>
          <h2>{course.name}</h2>
          <p className="muted">{course.description || "Choose a membership duration to get started."}</p>
          {course.CoursePlans?.length ? <div className="client-offer-list">{course.CoursePlans.slice().sort((a, b) => Number(a.durationMonths) - Number(b.durationMonths)).map((plan) => {
            const offerId = `${course.id}-${plan.durationMonths}`;
            const busy = checkoutOfferId === offerId;
            const unpaid = unpaidCourses.has(course.id);
            return <div className="client-offer-row" key={plan.id}>
              <span><b>{plan.durationMonths} {Number(plan.durationMonths) === 1 ? "month" : "months"}</b><small>Membership offer</small></span>
              <strong>{currency(plan.price)}</strong>
              <Button type="button" variant="outline" disabled={!alreadyAccepted || Boolean(checkoutOfferId) || Boolean(checkoutMembershipId) || unpaid} onClick={() => checkoutOffer(course, plan)}>
                {busy ? "Starting…" : !alreadyAccepted ? "Accept waiver to continue" : unpaid ? "Pay current balance below" : "Choose & pay"}
              </Button>
            </div>;
          })}</div> : <p className="muted">No membership offers are available for this course yet.</p>}
        </article>
      ))}</div> : <EmptyState title="No courses available" detail="The gym will publish course offers here when they are ready." />}
    </Card>
    <div className="dashboard-grid">
      <Card title="Memberships" eyebrow="Your plans">
        {memberships.length ? <div className="membership-list">{memberships.map((membership) => {
          const paid = (membership.Payments ?? []).reduce((sum, payment) => sum + (payment.voidedAt ? 0 : Number(payment.amount || 0)), 0);
          const due = Math.max(0, Number((Number(membership.totalAmount) - paid).toFixed(2)));
          return <article className="membership-row" key={membership.id}>
            <div><b>{membership.Course?.name ?? "Gym membership"}</b><small>{dateLabel(membership.startDate)} — {dateLabel(membership.endDate)}</small></div>
            <StatusPill tone={membership.status === "active" ? "success" : membership.status === "pending_payment" || membership.status === "expired" ? "warning" : "neutral"}>{membership.status.replaceAll("_", " ")}</StatusPill>
            <strong>{currency(membership.totalAmount)}</strong>
            {["active", "pending_payment"].includes(membership.status) && due > 0 && <Button type="button" variant="outline" disabled={!alreadyAccepted || Boolean(checkoutMembershipId)} onClick={() => checkout(membership.id)}>{checkoutMembershipId === membership.id ? "Opening…" : !alreadyAccepted ? "Accept waiver to pay" : `Pay ${currency(due)}`}</Button>}
          </article>;
        })}</div> : <EmptyState title="No membership found" detail="The gym team can help you choose a course and membership plan." />}
      </Card>
      <Card title="Gym agreement" eyebrow={`Current waiver · version ${currentVersion}`}>
        {waiver?.text && <div className="waiver-copy">{waiver.text}</div>}
        <div className="waiver-acceptance">{alreadyAccepted ? <StatusPill tone="success">Agreement accepted</StatusPill> : <><label className="checkbox-field"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I have read and agree to the current gym waiver.</span></label><Button onClick={accept} disabled={!accepted || saving}>{saving ? "Recording…" : "Accept agreement"}</Button></>}</div>
      </Card>
    </div>
    <Card title="Payment history" eyebrow="Recorded by the gym">
      {payments.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.dateTime)}</td><td>{payment.paymentMethod ?? "—"}</td><td>{currency(payment.amount)}</td><td><StatusPill tone={payment.voidedAt ? "warning" : "success"}>{payment.voidedAt ? "voided" : "recorded"}</StatusPill></td></tr>)}</tbody></table></div> : <EmptyState title="No payments recorded yet" detail="Payments recorded by the gym will appear here." />}
    </Card>
  </>;
}
