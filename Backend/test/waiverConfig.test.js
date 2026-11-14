import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentWaiver, getCurrentWaiverText, nextWaiverVersion, warnIfWaiverMissing } from "../src/utils/waiver.js";
import { publishWaiverSchema } from "../src/validation/index.js";

const noDocuments = { findOne: async () => null };

test("placeholder or missing environment waiver text falls back to the built-in agreement", async () => {
  assert.equal(getCurrentWaiverText({}), null);
  assert.equal(getCurrentWaiverText({ WAIVER_TEXT: "REPLACE_WITH_APPROVED_WAIVER_TEXT" }), null);
  assert.equal(getCurrentWaiverText({ WAIVER_TEXT: "  I agree to train safely.  " }), "I agree to train safely.");
  const fallback = await getCurrentWaiver({ DocumentModel: noDocuments, environment: { WAIVER_TEXT: "REPLACE_WITH_APPROVED_WAIVER_TEXT" } });
  assert.equal(fallback.source, "default");
  assert.equal(fallback.version, "1");
  assert.match(fallback.text, /TRAINING AGREEMENT/);
});

test("the newest published agreement is current; otherwise the environment fallback", async () => {
  const createdAt = new Date("2026-11-04T10:00:00Z");
  const published = await getCurrentWaiver({ DocumentModel: { findOne: async () => ({ version: "2", text: "App text", createdAt }) }, environment: { WAIVER_TEXT: "Env text" } });
  assert.deepEqual(published, { version: "2", text: "App text", source: "app", publishedAt: createdAt });
  const fallback = await getCurrentWaiver({ DocumentModel: noDocuments, environment: { WAIVER_TEXT: "Env text", WAIVER_VERSION: "3" } });
  assert.deepEqual(fallback, { version: "3", text: "Env text", source: "environment", publishedAt: null });
});

test("published versions always move past versions already in use", () => {
  assert.equal(nextWaiverVersion([], null), "1");
  assert.equal(nextWaiverVersion([], { version: "1" }), "2");
  assert.equal(nextWaiverVersion(["1", "2", "5"], { version: "5" }), "6");
  assert.equal(nextWaiverVersion(["2"], { version: "legal-v9" }), "3");
});

test("publishing needs real agreement text", () => {
  assert.ok(publishWaiverSchema.validate({ text: "too short" }).error);
  assert.ok(publishWaiverSchema.validate({}).error);
  assert.equal(publishWaiverSchema.validate({ text: `  ${"a".repeat(60)}  ` }).value.text, "a".repeat(60));
});

test("production reminds the owner while the built-in agreement is in use", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  warnIfWaiverMissing({ source: "default" }, { NODE_ENV: "production" });
  warnIfWaiverMissing({ source: "app" }, { NODE_ENV: "production" });
  warnIfWaiverMissing({ source: "default" }, {});
  assert.equal(warn.mock.callCount(), 1);
});
