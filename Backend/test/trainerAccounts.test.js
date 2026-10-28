import assert from "node:assert/strict";
import test from "node:test";
import { getTrainerCredentials } from "../src/config/trainerAccounts.js";

const validEnvironment = {
  TRAINER_1_NAME: "Trainer One",
  TRAINER_1_EMAIL: "one@example.com",
  TRAINER_1_PASSWORD: "trainer-one-password",
  TRAINER_2_NAME: "Trainer Two",
  TRAINER_2_EMAIL: "two@example.com",
  TRAINER_2_PASSWORD: "trainer-two-password",
  TRAINER_3_NAME: "Trainer Three",
  TRAINER_3_EMAIL: "three@example.com",
  TRAINER_3_PASSWORD: "trainer-three-password",
};

test("trainer bootstrap accounts are optional", () => {
  assert.deepEqual(getTrainerCredentials({}), []);
});

test("configured trainer credentials must be complete", () => {
  assert.throws(
    () => getTrainerCredentials({ TRAINER_1_EMAIL: "one@example.com" }),
    /Configure each optional trainer bootstrap account/,
  );
});

test("trainer credentials are normalized and returned in order", () => {
  assert.deepEqual(getTrainerCredentials({
    ...validEnvironment,
    TRAINER_1_NAME: " Trainer One ",
    TRAINER_1_EMAIL: " ONE@EXAMPLE.COM ",
  }), [
    { name: "Trainer One", email: "one@example.com", password: "trainer-one-password" },
    { name: "Trainer Two", email: "two@example.com", password: "trainer-two-password" },
    { name: "Trainer Three", email: "three@example.com", password: "trainer-three-password" },
  ]);
});

test("trainer credentials require unique emails", () => {
  assert.throws(
    () => getTrainerCredentials({
      ...validEnvironment,
      TRAINER_3_EMAIL: validEnvironment.TRAINER_1_EMAIL,
    }),
    /unique email addresses/,
  );
});
