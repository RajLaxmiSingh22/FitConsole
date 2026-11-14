import { useState } from "react";
import { LoadingState } from "../../../components/ui/index.js";
import { currency } from "../../../utils/format.js";
import { durationLabel, pricedPlans } from "../../../utils/membership.js";

// Membership pricing: pick a program, compare its durations side by side.
export default function PricingCards({ courses, loading }) {
  const priced = courses.filter((course) => course.CoursePlans?.length);
  const [courseId, setCourseId] = useState("");
  if (loading) return <LoadingState label="Loading prices…" />;
  if (!priced.length) return <p className="public-unconfigured">Membership prices are not configured yet.</p>;
  const course = priced.find((item) => item.id === courseId) ?? priced[0];
  const plans = pricedPlans(course.CoursePlans);

  return <div className="pricing">
    {priced.length > 1 && <div className="tt-filters pricing-tabs" role="tablist" aria-label="Program">
      {priced.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === course.id} className={item.id === course.id ? "is-active" : ""} onClick={() => setCourseId(item.id)}>{item.name}</button>)}
    </div>}
    <div className="pricing-grid">{plans.map((plan) => <article key={plan.id} className={`home-card pricing-card ${plan.bestValue ? "is-best" : ""}`}>
      {plan.bestValue && <span className="pricing-badge">Best value</span>}
      <span className="home-tag">{durationLabel(plan.durationMonths)}</span>
      {plan.savingPercent > 0 && <s className="pricing-was" aria-label={`Usually ${currency(plans[0].monthly * plan.durationMonths)}`}>{currency(plans[0].monthly * plan.durationMonths)}</s>}
      <strong className="pricing-amount">{currency(plan.price)}</strong>
      <span className="pricing-monthly">{currency(plan.monthly)} per month</span>
      <span className={`pricing-saving ${plan.savingPercent ? "has-saving" : ""}`}>{plan.savingPercent ? `You save ${currency(plans[0].monthly * plan.durationMonths - Number(plan.price))} (${plan.savingPercent}%)` : "Most flexible · pay month to month"}</span>
      <ul className="pricing-includes">
        <li>All {course.name} classes</li>
        <li>Meal plan & progress tracking in the app</li>
        <li>Online check-in and receipts</li>
      </ul>
      <a className={`button ${plan.bestValue ? "button--primary" : "button--outline"}`} href="/register">Join now</a>
    </article>)}</div>
    <p className="timetable-note">Prices in INR. Not sure yet? <a href={`/trial?courseId=${encodeURIComponent(course.id)}`}>Book a trial class</a> first.</p>
  </div>;
}
