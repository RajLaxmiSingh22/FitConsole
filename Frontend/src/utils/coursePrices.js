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

// Gentle warnings (never blocking): a longer plan whose price per month is the same as, or higher than,
// the nearest shorter plan. `entries` is [{ months, price }]; returns [{ months, shorter, message }].
export function planWarnings(entries) {
  const valid = entries
    .map(({ months, price }) => ({ months: Number(months), price: Number(price) }))
    .filter(({ months, price }) => months > 0 && Number.isFinite(price) && price > 0)
    .sort((a, b) => a.months - b.months);
  const warnings = [];
  for (let index = 1; index < valid.length; index += 1) {
    const shorter = valid[index - 1];
    const longer = valid[index];
    const shorterPerMonth = shorter.price / shorter.months;
    const longerPerMonth = longer.price / longer.months;
    const name = (months) => `${months} ${months === 1 ? "month" : "months"}`;
    if (longerPerMonth === shorterPerMonth) {
      warnings.push({ months: longer.months, shorter: shorter.months, message: `${name(longer.months)} costs the same per month as ${name(shorter.months)} — members get no extra saving.` });
    } else if (longerPerMonth > shorterPerMonth) {
      warnings.push({ months: longer.months, shorter: shorter.months, message: `${name(longer.months)} costs more per month than ${name(shorter.months)}.` });
    }
  }
  return warnings;
}

// Form values ({ 1: "1000", 2: "" … }) as entries for planWarnings.
export function valuesToEntries(values) {
  return durations.filter(({ months }) => values[months] !== "" && values[months] != null).map(({ months }) => ({ months, price: values[months] }));
}
