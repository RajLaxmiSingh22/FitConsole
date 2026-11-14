import assert from "node:assert/strict";
import test from "node:test";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../src/auth.js";
import { csrfProtection } from "../src/middleware/csrfProtection.js";
import { createCourseSchema, planPriceOrderError, updateCourseSchema } from "../src/validation/index.js";

function run(req) {
  let status = 0;
  let passed = false;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  csrfProtection({ get: (name) => req.headers?.[name.toLowerCase()], ...req }, res, () => { passed = true; });
  return { status, passed };
}

const session = { [ACCESS_COOKIE]: "session-jwt", [CSRF_COOKIE]: "token-123" };

test("POST /api/courses without the CSRF header is refused with 403", () => {
  assert.deepEqual(run({ method: "POST", path: "/api/courses", cookies: session, headers: {} }), { status: 403, passed: false });
  assert.deepEqual(run({ method: "POST", path: "/api/courses", cookies: session, headers: { "x-csrf-token": "stale-token" } }), { status: 403, passed: false });
});

test("POST /api/courses with the matching CSRF header reaches the controller", () => {
  assert.deepEqual(run({ method: "POST", path: "/api/courses", cookies: session, headers: { "x-csrf-token": "token-123" } }), { status: 0, passed: true });
});

const course = (plans) => ({ name: "Boxing", category: "combat", plans });

test("course prices must be positive", () => {
  assert.ok(createCourseSchema.validate(course([{ durationMonths: 1, price: 0 }])).error);
  assert.ok(createCourseSchema.validate(course([{ durationMonths: 1, price: -5 }])).error);
});

test("longer plans may not cost less than shorter ones", () => {
  const ok = [{ durationMonths: 1, price: 1000 }, { durationMonths: 2, price: 1960 }, { durationMonths: 3, price: 2940 }, { durationMonths: 6, price: 5700 }, { durationMonths: 12, price: 10800 }];
  assert.equal(createCourseSchema.validate(course(ok)).error, undefined);
  assert.equal(createCourseSchema.validate(course([{ durationMonths: 3, price: 1000 }, { durationMonths: 1, price: 1000 }])).error, undefined);
  const bad = [{ durationMonths: 1, price: 1000 }, { durationMonths: 6, price: 900 }];
  assert.match(createCourseSchema.validate(course(bad)).error.message, /6-month price must be at least the 1-month price/);
  assert.ok(updateCourseSchema.validate({ plans: bad }).error);
  assert.equal(planPriceOrderError(ok), null);
});

test("price order covers all five durations, including 2 months, on create and update", () => {
  const all = [1, 2, 3, 6, 12].map((durationMonths, index) => ({ durationMonths, price: 1000 * (index + 1) }));
  assert.equal(createCourseSchema.validate(course(all)).error, undefined);
  assert.equal(updateCourseSchema.validate({ plans: all }).error, undefined);
  // Equal prices are allowed; gaps compare with the nearest shorter plan.
  assert.equal(createCourseSchema.validate(course([{ durationMonths: 1, price: 900 }, { durationMonths: 2, price: 900 }, { durationMonths: 12, price: 900 }])).error, undefined);
  assert.match(createCourseSchema.validate(course([{ durationMonths: 1, price: 1000 }, { durationMonths: 2, price: 999 }])).error.message, /2-month price must be at least the 1-month price/);
  assert.match(updateCourseSchema.validate({ plans: [{ durationMonths: 6, price: 6000 }, { durationMonths: 12, price: 5999 }, { durationMonths: 1, price: 1000 }] }).error.message, /12-month price must be at least the 6-month price/);
  assert.ok(updateCourseSchema.validate({ plans: [{ durationMonths: 2, price: 0 }] }).error);
});
