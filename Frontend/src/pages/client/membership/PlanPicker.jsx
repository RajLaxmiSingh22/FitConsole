import { useMemo, useState } from "react";
import { Button, EmptyState } from "../../../components/ui/index.js";
import { currency } from "../../../utils/format.js";
import { durationLabel, pricedPlans } from "../../../utils/membership.js";
import AgreementConsent from "./AgreementConsent.jsx";

// Step 2: pick a course, then a duration card; the summary holds the single pay button.
const PENDING_PLAN_KEY = "fitconsole.pendingPlan";

// The demo's "Create my account" remembers the plan so the new member lands on it after signing up.
export function rememberPendingPlan(plan) {
  try { sessionStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(plan)); } catch { /* storage unavailable */ }
}
export function takePendingPlan() {
  try {
    const raw = sessionStorage.getItem(PENDING_PLAN_KEY);
    sessionStorage.removeItem(PENDING_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PlanPicker({ initialPlan = null, courses, canPay, consent, lockedReason, blockedCourseIds, busy, error, onCheckout }) {
  const available = useMemo(() => courses.filter((course) => course.CoursePlans?.length), [courses]);
  const [courseId, setCourseId] = useState(() => (available.some((item) => item.id === initialPlan?.courseId) ? initialPlan.courseId : available[0]?.id ?? ""));
  const course = available.find((item) => item.id === courseId) ?? available[0];
  const plans = useMemo(() => pricedPlans(course?.CoursePlans), [course]);
  const [planId, setPlanId] = useState(() => (course && course.id === initialPlan?.courseId
    ? plans.find((item) => Number(item.durationMonths) === Number(initialPlan.durationMonths))?.id ?? ""
    : ""));
  const plan = plans.find((item) => item.id === planId);
  const blocked = course ? blockedCourseIds.has(course.id) : false;

  function chooseCourse(id) {
    setCourseId(id);
    setPlanId("");
  }

  if (!available.length) {
    return <EmptyState title="No plans available yet" detail="The gym will publish course offers here when they are ready." />;
  }

  const payDisabledReason = !plan ? "Choose a duration to continue."
    : !canPay ? lockedReason
      : blocked ? "You already have an unpaid membership for this course. Pay it at the top of this page." : "";

  return <div className="mship-picker">
    <div className="mship-courses" role="radiogroup" aria-label="Course">
      {available.map((item) => <button
        key={item.id}
        type="button"
        role="radio"
        aria-checked={item.id === course.id}
        className={`mship-course ${item.id === course.id ? "is-selected" : ""}`}
        onClick={() => chooseCourse(item.id)}
      >
        <small>{item.category || "Program"}</small>
        <b>{item.name}</b>
        <span>From {currency(Math.min(...item.CoursePlans.map((row) => Number(row.price))))}</span>
      </button>)}
    </div>

    {course.description && <p className="muted mship-course-description">{course.description}</p>}

    <div className="mship-layout">
      <div className="mship-plans" role="radiogroup" aria-label="Duration">
        {plans.map((row) => <button
          key={row.id}
          type="button"
          role="radio"
          aria-checked={row.id === planId}
          className={`mship-plan ${row.id === planId ? "is-selected" : ""} ${row.bestValue ? "is-best" : ""}`}
          onClick={() => setPlanId(row.id)}
        >
          {row.bestValue && <span className="mship-badge">Best value</span>}
          <span className="mship-plan-duration">{durationLabel(row.durationMonths)}</span>
          <strong>{currency(row.price)}</strong>
          <span className="mship-plan-monthly">{currency(row.monthly)} / month</span>
          <span className="mship-plan-saving">{row.savingPercent ? `Save ${row.savingPercent}%` : "Standard price"}</span>
          <span className="mship-plan-check" aria-hidden="true">{row.id === planId ? "✓" : ""}</span>
        </button>)}
      </div>

      <aside className="mship-summary" aria-label="Order summary">
        <p className="overline">YOUR ORDER</p>
        <dl>
          <div><dt>Course</dt><dd>{course.name}</dd></div>
          <div><dt>Duration</dt><dd>{plan ? durationLabel(plan.durationMonths) : "—"}</dd></div>
          {plan?.savingPercent > 0 && <div><dt>You save</dt><dd className="mship-save">{plan.savingPercent}% vs monthly</dd></div>}
          <div className="mship-total"><dt>Total</dt><dd>{plan ? currency(plan.price) : "—"}</dd></div>
        </dl>
        {consent.needed && <AgreementConsent checked={consent.checked} onChange={consent.onChange} disabled={busy} />}
        <Button className="button--wide" disabled={Boolean(payDisabledReason) || busy} onClick={() => onCheckout(course, plan)}>
          {busy ? "Opening secure checkout…" : plan ? `Pay ${currency(plan.price)} securely` : "Pay securely"}
        </Button>
        {error && <p className="mship-summary-error" role="alert">{error}</p>}
        <p className="mship-summary-note">{payDisabledReason || "UPI, debit and credit cards · secured by Cashfree. Your membership starts once the payment is confirmed."}</p>
      </aside>
    </div>
  </div>;
}
