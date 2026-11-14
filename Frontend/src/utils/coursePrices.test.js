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
