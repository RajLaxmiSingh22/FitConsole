import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";

async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("unknown routes return the JSON error envelope", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { status: "error", message: "Route not found." });
  });
});

test("malformed JSON bodies return 400 without a stack trace", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad json",
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, "error");
    assert.ok(!JSON.stringify(body).includes("at "));
  });
});
