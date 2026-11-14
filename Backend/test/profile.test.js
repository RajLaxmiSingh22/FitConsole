import assert from "node:assert/strict";
import test from "node:test";
import { avatarVersion, detectImageType } from "../src/controllers/profileController.js";
import { coachingToggleSchema, profileUpdateSchema } from "../src/validation/index.js";

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

test("avatar uploads are identified by their file signature", () => {
  assert.equal(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)])), "image/webp");
});

test("non-images and empty bodies are rejected", () => {
  assert.equal(detectImageType(pad([0x3c, 0x73, 0x76, 0x67])), null); // "<svg"
  assert.equal(detectImageType(Buffer.from("GIF89a-------")), null);
  assert.equal(detectImageType(Buffer.alloc(0)), null);
  assert.equal(detectImageType({}), null);
});

test("avatar version is a timestamp, or null without a photo", () => {
  assert.equal(avatarVersion(null), null);
  assert.equal(avatarVersion({ updatedAt: "2026-11-05T10:00:00.000Z" }), Date.parse("2026-11-05T10:00:00.000Z"));
});

test("profile name and coaching toggle are validated", () => {
  assert.equal(profileUpdateSchema.validate({ fullName: "  Raj  " }).value.fullName, "Raj");
  assert.ok(profileUpdateSchema.validate({ fullName: "R" }).error);
  assert.ok(profileUpdateSchema.validate({}).error);
  assert.ok(coachingToggleSchema.validate({}).error);
  assert.equal(coachingToggleSchema.validate({ enabled: true, role: "owner" }).value.role, undefined);
});
