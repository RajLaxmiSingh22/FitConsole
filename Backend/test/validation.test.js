import assert from "node:assert/strict";
import test from "node:test";
import { validateRequest } from "../src/middleware/validateRequest.js";
import {
  updateUserStatusSchema,
  dateRangeSchema,
  idParamsSchema,
  loginValidation,
  listMembershipsQuerySchema,
  registerValidation,
  userListQuerySchema,
} from "../src/validation/index.js";

function invokeValidation(schemas, request) {
  let nextCalled = false;
  let statusCode;
  let responseBody;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  validateRequest(schemas)(request, response, (error) => {
    assert.equal(error, undefined);
    nextCalled = true;
  });

  return { nextCalled, statusCode, responseBody, request };
}

test("valid body is normalized and unknown fields are removed", () => {
  const result = invokeValidation({ body: registerValidation }, {
    body: { fullName: " Test User ", email: "TEST@EXAMPLE.COM", password: "test-password-123", extra: "remove" },
    params: {},
    query: {},
  });

  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.request.body, {
    fullName: "Test User",
    email: "test@example.com",
    password: "test-password-123",
  });
});

test("schemas that previously rejected extra fields continue to reject them", () => {
  const result = invokeValidation({ body: updateUserStatusSchema }, {
    body: { active: true, role: "owner" },
    params: {},
    query: {},
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
});

test("invalid sensitive values return structured errors without echoing input", () => {
  const secret = "do-not-include-this-secret";
  const result = invokeValidation({ body: loginValidation }, {
    body: { email: "invalid-email", password: secret },
    params: {},
    query: {},
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.responseBody.status, "error");
  assert.equal(result.responseBody.message, "Request validation failed.");
  assert.ok(Array.isArray(result.responseBody.details));
  assert.equal(JSON.stringify(result.responseBody).includes(secret), false);
});

test("invalid path parameters are rejected before the controller", () => {
  const result = invokeValidation({ params: idParamsSchema }, {
    body: {},
    params: { id: "not-a-uuid" },
    query: {},
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.responseBody.details[0].field, "params.id");
});

test("invalid enum filters and malformed date ranges are rejected", () => {
  const badRole = invokeValidation({ query: userListQuerySchema }, {
    body: {},
    params: {},
    query: { role: "administrator" },
  });
  assert.equal(badRole.nextCalled, false);
  assert.equal(badRole.statusCode, 400);

  const badRange = dateRangeSchema.validate({ from: "2026-10-10", to: "2026-10-09" });
  assert.ok(badRange.error);
});

test("query parameters are converted and available as validated input", () => {
  const result = invokeValidation({ query: listMembershipsQuerySchema }, {
    body: {},
    params: {},
    query: { expiringWithin: "7" },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.request.validated.query.expiringWithin, 7);
});

test("multiple request sections are validated together", () => {
  const result = invokeValidation({
    body: registerValidation,
    params: idParamsSchema,
    query: userListQuerySchema,
  }, {
    body: { fullName: "Valid", email: "valid@example.com", password: "test-password-123" },
    params: { id: "d9428888-122b-4d9f-b97e-2c4b6208d4de" },
    query: { role: "client" },
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.request.validated.params.id, "d9428888-122b-4d9f-b97e-2c4b6208d4de");
  assert.equal(result.request.validated.query.role, "client");
});

test("errors from multiple request sections are collected before rejecting", () => {
  const result = invokeValidation({
    body: registerValidation,
    params: idParamsSchema,
    query: userListQuerySchema,
  }, {
    body: { fullName: "", email: "invalid", password: "short" },
    params: { id: "not-a-uuid" },
    query: { role: "unknown" },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.ok(result.responseBody.details.some((detail) => detail.field.startsWith("body.")));
  assert.ok(result.responseBody.details.some((detail) => detail.field === "params.id"));
  assert.ok(result.responseBody.details.some((detail) => detail.field === "query.role"));
});

test("unexpected schema failures return a safe server error", () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const result = invokeValidation({
      body: { validate() { throw new Error("internal schema failure"); } },
    }, {
      body: {},
      params: {},
      query: {},
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 500);
    assert.deepEqual(result.responseBody, {
      status: "error",
      message: "Unable to validate request.",
    });
  } finally {
    console.error = originalConsoleError;
  }
});
