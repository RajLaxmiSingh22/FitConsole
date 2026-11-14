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
import { hasAcceptedCurrentWaiver } from "../src/utils/waiver.js";
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

test("environment waiver is used while no agreement is published, and acceptance uses its version", async () => {
  let where;
  const accepted = await hasAcceptedCurrentWaiver("client-id", {
    findOne: async (query) => {
      where = query.where;
      return { id: "acceptance-id" };
    },
  }, { DocumentModel: { findOne: async () => null }, environment: { WAIVER_TEXT: "Approved terms", WAIVER_VERSION: "4" } });
  assert.equal(accepted, true);
  assert.deepEqual(where, { clientId: "client-id", agreementVersion: "4" });
});

test("a published agreement takes priority over the environment; otherwise the built-in version is checked", async () => {
  let where;
  const AcceptanceModel = { findOne: async (query) => { where = query.where; return null; } };
  const published = { findOne: async () => ({ version: "7", text: "Published terms", createdAt: new Date() }) };
  assert.equal(await hasAcceptedCurrentWaiver("client-id", AcceptanceModel, { DocumentModel: published, environment: { WAIVER_TEXT: "Old", WAIVER_VERSION: "4" } }), false);
  assert.equal(where.agreementVersion, "7");
  const none = { DocumentModel: { findOne: async () => null }, environment: { WAIVER_TEXT: "REPLACE_WITH_APPROVED_WAIVER_TEXT" } };
  assert.equal(await hasAcceptedCurrentWaiver("client-id", AcceptanceModel, none), false);
  assert.equal(where.agreementVersion, "1");
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
