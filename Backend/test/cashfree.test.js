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

test("Cashfree order status prioritizes success over pending attempts", () => {
  assert.equal(getCashfreePaymentStatus([
    { payment_status: "FAILED" },
    { payment_status: "PENDING" },
    { payment_status: "SUCCESS" },
  ]), "success");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "PENDING" }]), "pending");
  assert.equal(getCashfreePaymentStatus([{ payment_status: "FAILED" }]), "failed");
  assert.equal(getCashfreePaymentStatus([]), "failed");
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
