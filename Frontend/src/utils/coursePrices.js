import { durations } from "../constants/memberships.js";

// Per-field price problems for the course price form, keyed by months: every price must be above 0,
// and a longer plan may not cost less than the shorter plan before it (1m ≤ 2m ≤ 3m ≤ 6m ≤ 12m).
// Empty fields are skipped. The API applies the same rule (planPriceOrderError in the backend).
export function planErrors(values) {
  const errors = {};
  let previous = null;
  for (const { months, label } of durations) {
    const raw = values[months];
    if (raw === "" || raw == null) continue;
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) { errors[months] = "Must be greater than 0."; continue; }
    if (previous && price < previous.price) errors[months] = `Must be at least the ${previous.label} price.`;
    previous = { price, label };
  }
  return errors;
}
