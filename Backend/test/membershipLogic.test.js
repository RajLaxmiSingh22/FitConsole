import assert from "node:assert/strict";
import test from "node:test";
import { membershipPeriodsOverlap } from "../src/utils/membershipOverlap.js";
import { isReminderOpen } from "../src/utils/paymentReminders.js";

test("membership periods overlap when they share any day", () => {
  const existing = { startDate: "2026-10-01", endDate: "2026-10-31" };
  assert.equal(membershipPeriodsOverlap(existing, { startDate: "2026-10-31", endDate: "2026-11-30" }), true);
  assert.equal(membershipPeriodsOverlap(existing, { startDate: "2026-09-01", endDate: "2026-10-01" }), true);
  assert.equal(membershipPeriodsOverlap(existing, { startDate: "2026-11-01", endDate: "2026-11-30" }), false);
});

test("reminders close once the membership balance is paid or the reminder is resolved", () => {
  const membership = { totalAmount: "3000.00", Payments: [{ amount: "1000.00" }] };
  assert.equal(isReminderOpen({ resolvedAt: null }, membership), true);
  assert.equal(isReminderOpen({ resolvedAt: null }, { ...membership, Payments: [{ amount: "3000.00" }] }), false);
  assert.equal(isReminderOpen({ resolvedAt: new Date() }, membership), false);
  assert.equal(isReminderOpen({ resolvedAt: null }, null), true);
});
