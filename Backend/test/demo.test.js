import assert from "node:assert/strict";
import test from "node:test";
import { demoWriteBlocked, getDemoConfig, isDemoUser } from "../src/utils/demo.js";

const env = { DEMO_MODE_ENABLED: "true", DEMO_CLIENT_EMAIL: " Demo.Client@FitConsole.example.com ", DEMO_CLIENT_PASSWORD: "a-long-demo-password" };
const demoUser = { role: "client", email: "demo.client@fitconsole.example.com" };

test("demo mode needs the flag, an email and a password", () => {
  assert.equal(getDemoConfig(env).enabled, true);
  assert.equal(getDemoConfig(env).email, "demo.client@fitconsole.example.com");
  assert.equal(getDemoConfig({ ...env, DEMO_MODE_ENABLED: "false" }).enabled, false);
  assert.equal(getDemoConfig({ ...env, DEMO_CLIENT_PASSWORD: "" }).enabled, false);
});

test("only the configured client account is the demo user", () => {
  assert.equal(isDemoUser(demoUser, env), true);
  assert.equal(isDemoUser({ ...demoUser, role: "owner" }, env), false);
  assert.equal(isDemoUser({ role: "client", email: "someone@example.com" }, env), false);
  assert.equal(isDemoUser(demoUser, {}), false);
});

test("the demo user can read but never change data", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) assert.equal(demoWriteBlocked(demoUser, method, env), false);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(demoWriteBlocked(demoUser, method, env), true);
  assert.equal(demoWriteBlocked({ role: "client", email: "real@example.com" }, "POST", env), false);
});
