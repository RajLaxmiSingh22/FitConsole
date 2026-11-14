import { useState } from "react";
import { Button, Card, Notice, PageHeader } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { openCashfreeCheckout } from "../../services/cashfree.js";
import { dueAmount, isOpenMembership } from "../../utils/membership.js";
import { MembershipList, PaymentList } from "./membership/MembershipHistory.jsx";
import MembershipStatus from "./membership/MembershipStatus.jsx";
import DemoPaymentModal from "./membership/DemoPaymentModal.jsx";
import PlanPicker, { takePendingPlan } from "./membership/PlanPicker.jsx";

export default function Membership({ demo = false, hasPhone = true, courses, memberships, payments, waiver, waivers, onWaiverAccepted, onRefresh }) {
  const [error, setError] = useState("");
  const [checkoutMembershipId, setCheckoutMembershipId] = useState("");
  const [checkoutOfferId, setCheckoutOfferId] = useState("");
  const [acceptance, setAcceptance] = useState(false);
  // Demo account: Pay opens an explanation (and optional sandbox test) instead of a real checkout.
  const [demoPayment, setDemoPayment] = useState(null);
  const [pendingPlan] = useState(() => (demo ? null : takePendingPlan()));
  // One consent tick covers every Pay button on the page; it is recorded on the first payment.
  const [agreed, setAgreed] = useState(false);
  const currentVersion = waiver?.version ?? "1";
  const alreadyAccepted = acceptance || waivers.some((item) => item.agreementVersion === String(currentVersion));
  const paymentBusy = Boolean(checkoutOfferId) || Boolean(checkoutMembershipId);
  // Cashfree needs the member's phone; the server checks this too.
  const canPay = demo || (hasPhone && (alreadyAccepted || agreed));
  const lockedReason = !hasPhone ? "Add your phone number in Profile to pay online." : "Tick the agreement box to continue.";
  const openProfile = () => window.dispatchEvent(new CustomEvent("fitconsole:navigate", { detail: "Profile" }));

  // Records the member's acceptance the first time they pay; returns false if it could not be saved.
  async function ensureAccepted() {
    if (alreadyAccepted) return true;
    try {
      await apiCalls.waivers.accept(null);
      setAcceptance(true);
      onWaiverAccepted();
      return true;
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to record your agreement. Please try again."));
      return false;
    }
  }
  async function checkout(membershipId) {
    if (demo) return setDemoPayment({ membershipId });
    setCheckoutMembershipId(membershipId);
    setError("");
    try {
      if (!(await ensureAccepted())) return;
      const result = responseData(await apiCalls.payments.createCashfreeOrder({ membershipId }));
      await openCashfreeCheckout(result.paymentSessionId);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to start Cashfree checkout."));
    } finally {
      setCheckoutMembershipId("");
    }
  }
  async function checkoutOffer(course, plan) {
    if (demo) return setDemoPayment({ courseId: course.id, durationMonths: Number(plan.durationMonths), label: `${course.name} · ${plan.durationMonths} month${Number(plan.durationMonths) === 1 ? "" : "s"}` });
    const offerId = `${course.id}-${plan.durationMonths}`;
    setCheckoutOfferId(offerId);
    setError("");
    let membershipCreated = false;
    try {
      if (!(await ensureAccepted())) return;
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
        setError(`${getApiError(requestError, "Unable to start Cashfree checkout.")} Your membership is saved; use the Pay button at the top to try again.`);
      } else {
        setError(getApiError(requestError, "Unable to start this course offer."));
      }
    } finally {
      setCheckoutOfferId("");
    }
  }
  const unpaidCourses = new Set(memberships
    .filter((membership) => isOpenMembership(membership) && dueAmount(membership) > 0)
    .map((membership) => membership.courseId));
  const consent = { needed: !demo && !alreadyAccepted, checked: agreed, onChange: setAgreed };

  return <>
    <PageHeader eyebrow="Account" title="Membership & payments" description="Choose a plan and pay securely in a few taps." />
    <Notice error={error} onDismiss={() => setError("")} />
    {demoPayment && <DemoPaymentModal payment={demoPayment} onClose={() => setDemoPayment(null)} />}
    <MembershipStatus memberships={memberships} canPay={canPay} consent={consent} lockedReason={lockedReason} busy={paymentBusy} payingId={checkoutMembershipId} onPay={checkout} />
    {!hasPhone && <section className="mship-step is-blocked" aria-label="Phone number needed">
      <span className="mship-step-number" aria-hidden="true">!</span>
      <div className="mship-step-body">
        <b>Add your phone number to pay online</b>
        <small>The payment provider needs a mobile number to send your payment confirmation.</small>
        <div className="mship-step-actions"><Button variant="outline" onClick={openProfile}>Go to Profile</Button></div>
      </div>
    </section>}
    <Card className="mship-plans-card" title="Choose your plan" eyebrow="Plans & pricing">
      <div id="choose-plan" />
      <PlanPicker initialPlan={pendingPlan} courses={courses} canPay={canPay && !checkoutMembershipId} consent={consent} lockedReason={lockedReason} blockedCourseIds={unpaidCourses} busy={Boolean(checkoutOfferId)} error={error} onCheckout={checkoutOffer} />
    </Card>
    <div className="dashboard-grid">
      <Card title="Your memberships" eyebrow="History">
        <MembershipList memberships={memberships} canPay={canPay} busy={paymentBusy} payingId={checkoutMembershipId} onPay={checkout} />
      </Card>
      <Card title="Payments" eyebrow="Receipts">
        <PaymentList payments={payments} />
      </Card>
    </div>
  </>;
}
