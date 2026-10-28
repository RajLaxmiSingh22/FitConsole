import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createAuthToken } from "../src/auth.js";
import { createLoginFailureLimiter, loginAccountKey } from "../src/middleware/loginFailureLimit.js";
import { publicRateLimit } from "../src/middleware/publicRateLimit.js";
import { passwordChangeSchema, registerValidation, loginValidation } from "../src/validation/index.js";

test("account limiter blocks after repeated failures regardless of IP and resets on success", () => {
  let clock = 0;
  const limiter = createLoginFailureLimiter({ limit: 3, windowMs: 1000, store: new Map(), now: () => clock });
  for (let i = 0; i < 3; i += 1) limiter.recordFailure("A@Example.com ");
  assert.ok(limiter.retryAfterSeconds("a@example.com") > 0);
  limiter.reset("a@example.com");
  assert.equal(limiter.retryAfterSeconds("a@example.com"), 0);
  for (let i = 0; i < 3; i += 1) limiter.recordFailure("a@example.com");
  clock = 1001;
  assert.equal(limiter.retryAfterSeconds("a@example.com"), 0);
});

test("account key is a hash, not the raw email", () => {
  assert.match(loginAccountKey("a@example.com"), /^[0-9a-f]{64}$/);
});

test("tokens carry the user's token version", () => {
  process.env.JWT_SECRET ??= "x".repeat(40);
  const payload = jwt.decode(createAuthToken({ id: "00000000-0000-4000-8000-000000000000", tokenVersion: 3 }));
  assert.equal(payload.ver, 3);
});

test("public rate limit evicts old buckets instead of returning 503 when full", () => {
  const middleware = publicRateLimit({ limit: 100, windowMs: 60_000, keyPrefix: `evict-${Date.now()}` });
  let lastStatus;
  const res = { set() {}, status(code) { lastStatus = code; return { json() {} }; } };
  for (let i = 0; i < 25_010; i += 1) {
    let passed = false;
    middleware({ ip: `10.${i}` }, res, () => { passed = true; });
    assert.ok(passed, `request ${i} was rejected with ${lastStatus}`);
  }
});

test("new passwords require 12 characters, login still accepts existing 8-character passwords", () => {
  assert.ok(registerValidation.validate({ fullName: "A", email: "a@b.co", password: "elevenchars" }).error);
  assert.ok(passwordChangeSchema.validate({ currentPassword: "x", newPassword: "elevenchars" }).error);
  assert.equal(loginValidation.validate({ email: "a@b.co", password: "eightchr" }).error, undefined);
});
