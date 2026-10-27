import assert from "node:assert/strict";
import test from "node:test";
import { getOwnerCredentials } from "../src/config/ownerAccount.js";

test("owner credentials require an email and strong password", () => {
  assert.throws(
    () => getOwnerCredentials({}),
    /Configure OWNER_EMAIL and OWNER_PASSWORD/,
  );

  assert.throws(
    () => getOwnerCredentials({
      OWNER_EMAIL: "owner@example.com",
      OWNER_PASSWORD: "too-short",
    }),
    /Configure OWNER_EMAIL and OWNER_PASSWORD/,
  );
});

test("owner email is normalized and name has a safe default", () => {
  assert.deepEqual(getOwnerCredentials({
    OWNER_EMAIL: " Owner@Example.COM ",
    OWNER_PASSWORD: "a-long-enough-owner-password",
  }), {
    name: "FitConsole Owner",
    email: "owner@example.com",
    password: "a-long-enough-owner-password",
  });
});
