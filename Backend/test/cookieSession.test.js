import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";
import { tokensMatch } from "../src/auth.js";

async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("CSRF token comparison is exact", () => {
  assert.equal(tokensMatch("abc", "abc"), true);
  assert.equal(tokensMatch("abc", "abd"), false);
  assert.equal(tokensMatch(undefined, "abc"), false);
  assert.equal(tokensMatch("ab", "abc"), false);
});

test("state-changing requests with a session cookie need a matching CSRF header", async () => {
  await withServer(async (base) => {
    const cookie = "fc_access=anything; fc_csrf=expected-token";
    const missing = await fetch(`${base}/api/memberships`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" });
    assert.equal(missing.status, 403);
    const wrong = await fetch(`${base}/api/memberships`, { method: "POST", headers: { cookie, "x-csrf-token": "other", "content-type": "application/json" }, body: "{}" });
    assert.equal(wrong.status, 403);
    const matching = await fetch(`${base}/api/memberships`, { method: "POST", headers: { cookie, "x-csrf-token": "expected-token", "content-type": "application/json" }, body: "{}" });
    assert.equal(matching.status, 401, "passes CSRF and then fails authentication on the fake token");
  });
});

test("bearer headers no longer authenticate and logout clears cookies without a CSRF header", async () => {
  await withServer(async (base) => {
    const me = await fetch(`${base}/api/auth/me`, { headers: { authorization: "Bearer whatever" } });
    assert.equal(me.status, 401);
    const logout = await fetch(`${base}/api/auth/logout`, { method: "POST" });
    assert.equal(logout.status, 200);
    const cleared = logout.headers.getSetCookie().join("\n");
    assert.match(cleared, /fc_access=;/);
    assert.match(cleared, /fc_refresh=;/);
    assert.match(cleared, /SameSite=Strict/);
  });
});

test("CORS allows credentials only for configured origins", async () => {
  await withServer(async (base) => {
    const allowed = await fetch(`${base}/api/health`, { headers: { origin: "http://localhost:5173" } });
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
    const denied = await fetch(`${base}/api/health`, { headers: { origin: "https://evil.example" } });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });
});
