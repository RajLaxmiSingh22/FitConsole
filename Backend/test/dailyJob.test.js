import assert from "node:assert/strict";
import test from "node:test";
import { Op } from "sequelize";
import { runDailyJob, staleOrderAction } from "../src/jobs/daily.js";

test("stale order action records successes, fails dead orders and keeps pending attempts", () => {
  assert.equal(staleOrderAction([{ payment_status: "SUCCESS" }]), "record");
  assert.equal(staleOrderAction([]), "fail");
  assert.equal(staleOrderAction([{ payment_status: "USER_DROPPED" }]), "fail");
  assert.equal(staleOrderAction([{ payment_status: "PENDING" }]), "keep");
});

test("daily job expires by IST date, cancels old unpaid memberships and reconciles orders", async () => {
  const updates = [];
  const MembershipModel = { update: async (values, options) => { updates.push({ values, options }); return [values.status === "expired" ? 2 : 1]; } };
  const failed = [];
  const orders = [
    { cashfreeOrderId: "paid", update: async () => {} },
    { cashfreeOrderId: "dead", update: async (values) => failed.push(values) },
    { cashfreeOrderId: "boom", update: async () => {} },
  ];
  const recorded = [];
  const summary = await runDailyJob({
    MembershipModel,
    OrderModel: { findAll: async () => orders },
    fetchPayments: async (id) => {
      if (id === "boom") throw new Error("network");
      return id === "paid" ? [{ payment_status: "SUCCESS" }] : [];
    },
    recordSuccess: async (order) => recorded.push(order.cashfreeOrderId),
    pruneSessions: async () => 4,
    now: new Date("2026-10-27T23:30:00Z"),
  });
  assert.equal(updates[0].options.where.endDate[Op.lt], "2026-10-28");
  assert.deepEqual(recorded, ["paid"]);
  assert.deepEqual(failed, [{ status: "failed" }]);
  assert.deepEqual(summary, { expired: 2, cancelledPending: 1, ordersRecorded: 1, ordersFailed: 1, orderErrors: 1, sessionsPruned: 4 });
});
