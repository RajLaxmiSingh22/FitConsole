import assert from "node:assert/strict";
import test from "node:test";
import { planErrors } from "./coursePrices.js";

test("valid prices give no errors (equal prices and empty durations are fine)", () => {
  assert.deepEqual(planErrors({ 1: "1000", 2: "1960", 3: "2940", 6: "5700", 12: "10800" }), {});
  assert.deepEqual(planErrors({ 1: "1000", 2: "1000", 3: "", 6: "1000", 12: "" }), {});
  assert.deepEqual(planErrors({}), {});
});

test("every price must be above zero, shown on that field", () => {
  assert.deepEqual(planErrors({ 1: "0", 3: "-5", 6: "abc" }), { 1: "Must be greater than 0.", 3: "Must be greater than 0.", 6: "Must be greater than 0." });
});

test("a longer plan cheaper than the one before it is flagged on the longer field", () => {
  assert.deepEqual(planErrors({ 1: "1000", 2: "900" }), { 2: "Must be at least the 1 month price." });
  assert.deepEqual(planErrors({ 1: "1000", 3: "3000", 12: "2500" }), { 12: "Must be at least the 3 months price." });
  // Gaps are compared with the nearest filled shorter plan.
  assert.deepEqual(planErrors({ 1: "1000", 6: "999" }), { 6: "Must be at least the 1 month price." });
});

import { planWarnings, valuesToEntries } from "./coursePrices.js";

test("no warning when each longer plan saves per month", () => {
  assert.deepEqual(planWarnings([{ months: 1, price: 1000 }, { months: 2, price: 1900 }, { months: 3, price: 2700 }, { months: 12, price: 10000 }]), []);
});

test("a longer plan with the same per-month price gets the 'no extra saving' warning", () => {
  // Matches the seeded Boxing course: 2 months (₹1,960) and 3 months (₹2,940) are both ₹980 a month.
  assert.deepEqual(planWarnings([{ months: 1, price: 1000 }, { months: 2, price: 2000 }, { months: 3, price: 3000 }]), [
    { months: 2, shorter: 1, message: "2 months costs the same per month as 1 month — members get no extra saving." },
    { months: 3, shorter: 2, message: "3 months costs the same per month as 2 months — members get no extra saving." },
  ]);
});

test("a longer plan that costs more per month gets a warning too; order of entries does not matter", () => {
  const warnings = planWarnings([{ months: 6, price: 6600 }, { months: 1, price: 1000 }, { months: 3, price: 3300 }]);
  assert.deepEqual(warnings.map((w) => w.months), [3, 6]);
  assert.equal(warnings[0].message, "3 months costs more per month than 1 month.");
});

test("incomplete or zero prices are ignored, and form values become entries", () => {
  assert.deepEqual(planWarnings([{ months: 1, price: 0 }, { months: 3, price: "" }]), []);
  assert.deepEqual(valuesToEntries({ 1: "1000", 2: "", 3: "2940" }), [{ months: 1, price: "1000" }, { months: 3, price: "2940" }]);
});
