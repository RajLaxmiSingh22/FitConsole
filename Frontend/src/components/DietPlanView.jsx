import { StatusPill } from "./ui.jsx";

function round(value) {
  return Math.round(Number(value) || 0);
}

function GenericPlan({ plan }) {
  return <div className="meal-plan-content">{Object.entries(plan ?? {}).map(([key, value]) => <section key={key}>
    <h3>{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</h3>
    {Array.isArray(value)
      ? <ul>{value.map((item, index) => <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>)}</ul>
      : <p>{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}</p>}
  </section>)}</div>;
}

// Renders the structured plan shape produced by the planner; older free-form plans fall back to a generic view.
export default function DietPlanView({ plan }) {
  if (!plan || !Array.isArray(plan.meals)) return <GenericPlan plan={plan} />;
  const itemTotal = plan.meals.reduce((sum, meal) => sum + (meal.items ?? []).reduce((total, item) => total + Number(item.calories || 0), 0), 0);
  const target = plan.targets?.dailyCalories ?? plan.dailyCalories;
  const withinTarget = target ? Math.abs(itemTotal - target) <= target * 0.1 : true;
  return <div className="diet-plan">
    <dl className="macro-summary">
      <div><dt>Calories</dt><dd>{round(plan.dailyCalories)} kcal</dd>{target ? <small>Target {round(target)}</small> : null}</div>
      <div><dt>Protein</dt><dd>{round(plan.macros?.proteinG)} g</dd>{plan.targets ? <small>Target {plan.targets.macros.proteinG} g</small> : null}</div>
      <div><dt>Carbs</dt><dd>{round(plan.macros?.carbsG)} g</dd>{plan.targets ? <small>Target {plan.targets.macros.carbsG} g</small> : null}</div>
      <div><dt>Fat</dt><dd>{round(plan.macros?.fatG)} g</dd>{plan.targets ? <small>Target {plan.targets.macros.fatG} g</small> : null}</div>
      <div><dt>Water</dt><dd>{plan.hydrationLitres ?? "—"} L</dd></div>
    </dl>
    <p className="muted">
      Meal items total {round(itemTotal)} kcal{" "}
      <StatusPill tone={withinTarget ? "success" : "warning"}>{withinTarget ? "✓ Within 10% of target" : "! Outside 10% of target"}</StatusPill>
    </p>
    <div className="table-wrap"><table className="meal-table">
      <thead><tr><th>Meal</th><th>Food</th><th>Quantity</th><th>kcal</th><th>Protein</th></tr></thead>
      <tbody>{plan.meals.flatMap((meal, mealIndex) => (meal.items ?? []).map((item, itemIndex) => <tr key={`${mealIndex}-${itemIndex}`}>
        {itemIndex === 0 && <th scope="rowgroup" rowSpan={meal.items.length}>{meal.name}<small>{meal.time}</small></th>}
        <td>{item.food}</td><td>{item.quantity}</td><td>{round(item.calories)}</td><td>{round(item.proteinG)} g</td>
      </tr>))}</tbody>
    </table></div>
    {plan.notes?.length ? <ul className="plan-notes">{plan.notes.map((note, index) => <li key={index}>{note}</li>)}</ul> : null}
  </div>;
}
