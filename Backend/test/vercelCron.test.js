import assert from "node:assert/strict";
import test from "node:test";
import { dailyMaintenance } from "../src/controllers/cronController.js";

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("Vercel maintenance route is unavailable without a configured secret", async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  const res = response();

  try {
    await dailyMaintenance({ headers: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, "error");
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("Vercel maintenance route rejects an incorrect secret", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  const res = response();

  try {
    await dailyMaintenance({ headers: { authorization: "Bearer wrong-secret" } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.status, "error");
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
