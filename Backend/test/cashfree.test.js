import assert from "node:assert/strict";
import test from "node:test";
import {
  getCashfreeClient,
  getCashfreePaymentMethod,
  getCashfreePaymentStatus,
  getCashfreeReturnUrl,
} from "../src/services/cashfree.js";
import { createCashfreeOrderSchema } from "../src/validation/payment.validation.js";
import { createClientMembershipSchema } from "../src/validation/membership.validation.js";
import { recordCashfreeSuccess } from "../src/services/cashfreePayment.js";

test("Cashfree order status prioritizes success over pending attempts", () => {
  assert.equal(getCashfreePaymentStatus([
    { payment_status: "FAILED" },
    { payment_status: "PENDING" },
    { payment_status: "SUCCESS" },
  ]), "success");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "PENDING" }]), "pending");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "FAILED" }]), "failed");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "USER_DROPPED" }]), "failed");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "CANCELLED" }]), "failed");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "FAILED" }, { payment_status: "UNKNOWN" }]), "pending");
  assert.equal(getCashfreePaymentStatus([]), "pending");
});

test("Cashfree success recording is idempotent for a repeated webhook or return", async () => {
  const state = {
    order: {
      id: "order-row-id",
      cashfreeOrderId: "fitconsole_order",
      membershipId: "membership-id",
      clientId: "client-id",
      amount: "25.00",
      reminderDate: null,
      paymentId: null,
      status: "pending",
    },
    payments: [],
    details: [],
    audits: [],
  };
  const dependencies = {
    sequelize: {
      transaction: (callback) => callback({ LOCK: { UPDATE: "UPDATE" } }),
    },
    CashfreeOrder: {
      findByPk: async () => ({
        ...state.order,
        update: async (fields) => Object.assign(state.order, fields),
      }),
    },
    Membership: {
      findByPk: async () => ({ id: "membership-id", totalAmount: "20.00" }),
    },
    Payment: {
      sum: async () => state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      findByPk: async (id) => state.payments.find((payment) => payment.id === id),
      create: async (values) => {
        const payment = {
          id: `payment-${state.payments.length + 1}`,
          ...values,
          toJSON() {
            const { toJSON, ...serialized } = this;
            return serialized;
          },
        };
        state.payments.push(payment);
        return payment;
      },
    },
    PaymentDetails: {
      create: async (values) => state.details.push(values),
    },
    PaymentAudit: {
      create: async (values) => state.audits.push(values),
    },
  };
  const order = { id: state.order.id, cashfreeOrderId: state.order.cashfreeOrderId, amount: state.order.amount };
  const providerPayment = {
    order_id: state.order.cashfreeOrderId,
    payment_status: "SUCCESS",
    payment_amount: 25,
    payment_currency: "INR",
    payment_group: "upi",
  };

  const originalWarn = console.warn;
  let warningCount = 0;
  console.warn = () => { warningCount += 1; };
  let first;
  let second;
  try {
    first = await recordCashfreeSuccess(order, providerPayment, dependencies);
    second = await recordCashfreeSuccess(order, providerPayment, dependencies);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(first.id, second.id);
  assert.equal(first.needsReview, true);
  assert.equal(warningCount, 1);
  assert.equal(state.payments.length, 1);
  assert.equal(state.details.length, 1);
  assert.equal(state.audits.length, 1);
  assert.equal(state.order.status, "success");
  assert.equal(state.order.paymentId, first.id);
});

test("Cashfree payment activates a pending membership when the full balance is collected", async () => {
  const membership = {
    id: "membership-id",
    status: "pending_payment",
    totalAmount: "100.00",
    update: async (values) => Object.assign(membership, values),
  };
  const orderState = {
    id: "order-row-id",
    cashfreeOrderId: "fitconsole_order",
    membershipId: membership.id,
    clientId: "client-id",
    createdById: "owner-id",
    amount: "40.00",
    reminderDate: null,
    status: "pending",
    update: async (values) => Object.assign(orderState, values),
  };
  let createdPayment;
  const dependencies = {
    sequelize: {
      transaction: (callback) => callback({ LOCK: { UPDATE: "UPDATE" } }),
    },
    CashfreeOrder: { findByPk: async () => orderState },
    Membership: { findByPk: async () => membership },
    Payment: {
      sum: async () => 60,
      create: async (values) => {
        createdPayment = {
          id: "payment-id",
          ...values,
          toJSON() {
            const { toJSON, ...serialized } = this;
            return serialized;
          },
        };
        return createdPayment;
      },
    },
    PaymentDetails: { create: async () => null },
    PaymentAudit: { create: async () => null },
  };
  await recordCashfreeSuccess(
    { id: orderState.id, cashfreeOrderId: orderState.cashfreeOrderId, amount: orderState.amount },
    {
      order_id: orderState.cashfreeOrderId,
      payment_status: "SUCCESS",
      payment_amount: 40,
      payment_currency: "INR",
      payment_group: "upi",
    },
    dependencies,
  );

  assert.equal(membership.status, "active");
  assert.equal(orderState.status, "success");
  assert.equal(createdPayment.needsReview, false);
});

test("Cashfree payment groups map only to supported payment methods", () => {
  assert.equal(getCashfreePaymentMethod("upi"), "upi");
  assert.equal(getCashfreePaymentMethod("upi_ppi"), "upi");
  assert.equal(getCashfreePaymentMethod("credit_card"), "card");
  assert.equal(getCashfreePaymentMethod("debit_card"), "card");
  assert.equal(getCashfreePaymentMethod("net_banking"), null);
});

test("Cashfree return URL preserves the provider order ID placeholder", () => {
  const previousUrl = process.env.CASHFREE_RETURN_URL;
  process.env.CASHFREE_RETURN_URL = "https://fitconsole.example/";
  try {
    assert.equal(
      getCashfreeReturnUrl("{order_id}"),
      "https://fitconsole.example/?cashfree_order_id={order_id}",
    );
  } finally {
    if (previousUrl === undefined) delete process.env.CASHFREE_RETURN_URL;
    else process.env.CASHFREE_RETURN_URL = previousUrl;
  }
});

test("Cashfree credentials support existing environment variable names", () => {
  const previous = {
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    legacyAppId: process.env.Cashfree_ID,
    legacySecretKey: process.env.Cashfree_Secret_Key,
  };
  delete process.env.CASHFREE_APP_ID;
  delete process.env.CASHFREE_SECRET_KEY;
  process.env.Cashfree_ID = "sandbox-app-id";
  process.env.Cashfree_Secret_Key = "sandbox-secret";
  try {
    assert.doesNotThrow(() => getCashfreeClient());
  } finally {
    for (const [key, value] of [
      ["CASHFREE_APP_ID", previous.appId],
      ["CASHFREE_SECRET_KEY", previous.secretKey],
      ["Cashfree_ID", previous.legacyAppId],
      ["Cashfree_Secret_Key", previous.legacySecretKey],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Cashfree return URL falls back to the first configured CORS origin", () => {
  const previous = {
    returnUrl: process.env.CASHFREE_RETURN_URL,
    corsOrigin: process.env.CORS_ORIGIN,
  };
  delete process.env.CASHFREE_RETURN_URL;
  process.env.CORS_ORIGIN = "https://fitconsole.example,https://admin.example";
  try {
    assert.equal(
      getCashfreeReturnUrl("{order_id}"),
      "https://fitconsole.example/?cashfree_order_id={order_id}",
    );
  } finally {
    if (previous.returnUrl === undefined) delete process.env.CASHFREE_RETURN_URL;
    else process.env.CASHFREE_RETURN_URL = previous.returnUrl;
    if (previous.corsOrigin === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previous.corsOrigin;
  }
});

test("Cashfree order request schema accepts client and owner checkout shapes", () => {
  const membershipId = "d9428888-122b-4d9f-b97e-2c4b6208d4de";
  const clientId = "d9428888-122b-4d9f-b97e-2c4b6208d4df";

  assert.equal(createCashfreeOrderSchema.validate({ membershipId }).error, undefined);
  assert.equal(createCashfreeOrderSchema.validate({ clientId, amount: 10.25 }).error, undefined);
  assert.ok(createCashfreeOrderSchema.validate({ clientId }).error);
  assert.ok(createCashfreeOrderSchema.validate({ membershipId, amount: 10 }).error);
});

test("client offer selection accepts only course and published duration fields", () => {
  const courseId = "d9428888-122b-4d9f-b97e-2c4b6208d4de";
  assert.equal(
    createClientMembershipSchema.validate({ courseId, durationMonths: 3 }).error,
    undefined,
  );
  assert.ok(createClientMembershipSchema.validate({ courseId, durationMonths: 2 }).error);
  assert.equal(
    createClientMembershipSchema.validate({ courseId, durationMonths: 3, price: 1 }).value.price,
    undefined,
  );
});
