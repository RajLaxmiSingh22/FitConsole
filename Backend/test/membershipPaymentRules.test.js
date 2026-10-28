import assert from "node:assert/strict";
import test from "node:test";
import {
  isMembershipPaid,
  isMembershipValidOnDate,
  membershipStatusForBalance,
  remainingMembershipBalance,
  totalNonVoidedPayments,
} from "../src/utils/membershipPayments.js";
import { todayInGymTz } from "../src/utils/dates.js";
import { assertCurrentWaiverConfigured, hasAcceptedCurrentWaiver } from "../src/utils/waiver.js";
import { getExistingPendingMembership } from "../src/utils/pendingMembership.js";
import { checkInSchema } from "../src/validation/attendance.validation.js";
import { voidPaymentSchema, updatePaymentSchema } from "../src/validation/payment.validation.js";
import { Op } from "sequelize";

test("membership balances ignore voided payments and transition only at the full amount", () => {
  const payments = [
    { amount: "70.00", voidedAt: null },
    { amount: "30.00", voidedAt: new Date() },
  ];

  assert.equal(totalNonVoidedPayments(payments), 70);
  assert.equal(remainingMembershipBalance(100, payments), 30);
  assert.equal(remainingMembershipBalance(0.3, [{ amount: "0.10" }, { amount: "0.20" }]), 0);
  assert.equal(isMembershipPaid(100, payments), false);
  assert.equal(membershipStatusForBalance(100, payments), "pending_payment");
  assert.equal(membershipStatusForBalance(70, payments), "active");
  assert.equal(membershipStatusForBalance(100, payments, "cancelled"), "cancelled");
});

test("membership validity uses inclusive start and end dates", () => {
  const membership = {
    status: "active",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
  };
  assert.equal(isMembershipValidOnDate(membership, "2026-10-01"), true);
  assert.equal(isMembershipValidOnDate(membership, "2026-10-31"), true);
  assert.equal(isMembershipValidOnDate(membership, "2026-09-30"), false);
  assert.equal(isMembershipValidOnDate({ ...membership, status: "pending_payment" }, "2026-10-15"), false);
});

test("gym-local date calculation converts late UTC timestamps into the next IST day", () => {
  assert.equal(todayInGymTz(new Date("2026-10-27T23:30:00.000Z"), "Asia/Kolkata"), "2026-10-28");
});

test("production startup rejects missing or placeholder waiver text", () => {
  assert.throws(() => assertCurrentWaiverConfigured({
    NODE_ENV: "production",
    WAIVER_TEXT: "REPLACE_WITH_APPROVED_WAIVER_TEXT",
  }), /WAIVER_TEXT/);
  assert.throws(() => assertCurrentWaiverConfigured({
    NODE_ENV: "production",
    WAIVER_TEXT: "  ",
  }), /WAIVER_TEXT/);
  assert.doesNotThrow(() => assertCurrentWaiverConfigured({
    NODE_ENV: "production",
    WAIVER_TEXT: "Approved terms",
  }));
});

test("waiver acceptance is checked against the configured current version", async () => {
  const previous = {
    text: process.env.WAIVER_TEXT,
    version: process.env.WAIVER_VERSION,
  };
  process.env.WAIVER_TEXT = "Approved terms";
  process.env.WAIVER_VERSION = "4";
  let where;
  try {
    const accepted = await hasAcceptedCurrentWaiver("client-id", {
      findOne: async (query) => {
        where = query.where;
        return { id: "acceptance-id" };
      },
    });
    assert.equal(accepted, true);
    assert.deepEqual(where, { clientId: "client-id", agreementVersion: "4" });
  } finally {
    if (previous.text === undefined) delete process.env.WAIVER_TEXT;
    else process.env.WAIVER_TEXT = previous.text;
    if (previous.version === undefined) delete process.env.WAIVER_VERSION;
    else process.env.WAIVER_VERSION = previous.version;
  }
});

test("pending membership reservation expires 48-hour-old entries and locks per client", async () => {
  const calls = [];
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const MembershipModel = {
    sequelize: {
      query: async (sql, options) => calls.push({ type: "lock", sql, options }),
    },
    update: async (values, options) => calls.push({ type: "expire", values, options }),
    findOne: async (options) => {
      calls.push({ type: "find", options });
      return null;
    },
  };
  await getExistingPendingMembership("client-id", transaction, {
    MembershipModel,
    now: new Date("2026-10-28T12:00:00.000Z"),
  });

  assert.match(calls[0].sql, /pg_advisory_xact_lock/);
  assert.equal(calls[0].options.replacements.key, "membership-pending:client-id");
  assert.equal(calls[1].options.where.createdAt[Op.lt].toISOString(), "2026-10-26T12:00:00.000Z");
  assert.equal(calls[2].options.lock, transaction.LOCK.UPDATE);
});

test("attendance and payment void schemas require explicit override and void reasons", () => {
  const clientId = "d9428888-122b-4d9f-b97e-2c4b6208d4de";
  const courseId = "d9428888-122b-4d9f-b97e-2c4b6208d4df";
  assert.equal(checkInSchema.validate({ clientId, courseId }).error, undefined);
  assert.ok(checkInSchema.validate({ clientId, courseId, override: true }).error);
  assert.equal(checkInSchema.validate({
    clientId,
    courseId,
    override: true,
    reason: "Approved by owner",
  }).error, undefined);
  assert.ok(voidPaymentSchema.validate({}).error);
  assert.equal(voidPaymentSchema.validate({ reason: "Duplicate entry" }).error, undefined);
  assert.ok(updatePaymentSchema.validate({ amount: 10, paymentMethod: "cash" }).error === undefined);
});
