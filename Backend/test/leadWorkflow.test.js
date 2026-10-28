import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsEventSchema,
  analyticsSummaryQuerySchema,
  trialBookingSchema,
} from "../src/validation/lead.validation.js";
import { canTransitionLead, normalizeIndianMobile } from "../src/utils/leadWorkflow.js";
import { publicRateLimit } from "../src/middleware/publicRateLimit.js";

test("Indian mobile normalization accepts local and +91 forms", () => {
  assert.equal(normalizeIndianMobile("98765 43210"), "9876543210");
  assert.equal(normalizeIndianMobile("+91 98765-43210"), "9876543210");
  assert.equal(normalizeIndianMobile("98765abc43210"), null);
  assert.equal(normalizeIndianMobile("1234567890"), null);
});

test("trial booking validation requires consent and validates Indian mobile", () => {
  const valid = trialBookingSchema.validate({
    name: "Test Member",
    phone: "+91 98765 43210",
    consent: true,
  });
  assert.equal(valid.error, undefined);
  assert.ok(trialBookingSchema.validate({
    name: "Test Member",
    phone: "1234567890",
    consent: true,
  }).error);
  assert.ok(trialBookingSchema.validate({
    name: "Test Member",
    phone: "9876543210",
    consent: false,
  }).error);
});

test("lead status transitions require confirmed trial attendance before enrollment", () => {
  assert.equal(canTransitionLead("new", "contacted"), true);
  assert.equal(canTransitionLead("new", "trial_attended"), false);
  assert.equal(canTransitionLead("trial_scheduled", "trial_attended"), false);
  assert.equal(canTransitionLead("trial_confirmed", "trial_attended"), true);
  assert.equal(canTransitionLead("trial_attended", "enrolled"), true);
  assert.equal(canTransitionLead("enrolled", "contacted"), false);
});

test("analytics events allow explicit opt-out but validate event identifiers", () => {
  const result = analyticsEventSchema.validate({
    eventId: "53e4e67e-6a91-4620-9272-209bef104101",
    visitorId: "94dc03e1-ecf3-4f13-9ed5-c0769bc71c60",
    sessionId: "d3ed8075-ef6a-44b2-91b5-b9419d19e134",
    type: "page_view",
    page: "/",
    consent: false,
  });
  assert.equal(result.error, undefined);
  assert.ok(analyticsEventSchema.validate({
    eventId: "not-a-uuid",
    visitorId: "94dc03e1-ecf3-4f13-9ed5-c0769bc71c60",
    sessionId: "d3ed8075-ef6a-44b2-91b5-b9419d19e134",
    type: "page_view",
    page: "/",
    consent: true,
  }).error);
});

test("analytics summary rejects reversed or excessively long ranges", () => {
  assert.ok(analyticsSummaryQuerySchema.validate({
    from: "2026-01-02",
    to: "2026-01-01",
  }).error);
  assert.ok(analyticsSummaryQuerySchema.validate({
    from: "2024-01-01",
    to: "2026-01-01",
  }).error);
});

test("public rate limiter blocks requests after the configured limit", () => {
  const middleware = publicRateLimit({
    limit: 1,
    windowMs: 60_000,
    keyPrefix: `test-${Date.now()}`,
  });
  let nextCalls = 0;
  const response = {
    headers: {},
    statusCode: 200,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const request = { ip: `test-${Math.random()}` };

  middleware(request, response, () => { nextCalls += 1; });
  middleware(request, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 429);
  assert.ok(Number(response.headers["Retry-After"]) > 0);
});

test("public rate limiter supports distinct identity keys", () => {
  const middleware = publicRateLimit({
    limit: 1,
    windowMs: 60_000,
    keyPrefix: `test-identities-${Date.now()}`,
    keyGenerator: (request) => `${request.ip}:${request.email}`,
  });
  const createResponse = () => ({
    statusCode: 200,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  });
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };

  middleware({ ip: "192.0.2.1", email: "one@example.com" }, createResponse(), next);
  middleware({ ip: "192.0.2.1", email: "two@example.com" }, createResponse(), next);
  const limitedResponse = createResponse();
  middleware({ ip: "192.0.2.1", email: "one@example.com" }, limitedResponse, next);

  assert.equal(nextCalls, 2);
  assert.equal(limitedResponse.statusCode, 429);
});
