import DietPlanView from "../../components/DietPlanView.jsx";
import { EmptyState, PageHeader, StatusPill } from "../../components/ui/index.js";
import { dateLabel } from "../../utils/format.js";

export default function MealPlan({ plans }) {
  const plan = plans[0];
  return <>
    <PageHeader eyebrow="Fuel for the work" title="Your meal plan" description="A trainer-reviewed plan to support your training. Talk to your coach before making major changes." />
    {plan ? <div className="meal-plan-card panel">
      <div className="meal-plan-heading"><div><p className="overline">APPROVED · {dateLabel(plan.reviewedAt ?? plan.updatedAt)}</p><h2>{plan.plan?.title ?? "Your personalized plan"}</h2></div><StatusPill tone="success">Coach approved</StatusPill></div>
      {typeof plan.plan === "string" ? <p className="plan-copy">{plan.plan}</p> : <DietPlanView plan={plan.plan} />}
      <p className="plan-disclaimer">General wellness guidance only. For medical or dietary conditions, consult a qualified healthcare professional.</p>
    </div> : <EmptyState title="No approved plan yet" detail="Your trainer will share a meal plan here after reviewing it." />}
  </>;
}
