import assert from "node:assert/strict";
import test from "node:test";
import { toContact } from "../src/controllers/gymSettingsController.js";
import { gymContactSchema, isGoogleMapsUrl } from "../src/validation/index.js";

const valid = { phone: "+91 00000 00001", email: "gym@example.com", address: "City, Country", mapUrl: "https://maps.app.goo.gl/abc123", whatsappEnabled: true };

test("unset contact details are returned as null, WhatsApp defaults on", () => {
  assert.deepEqual(toContact(null), { phone: null, email: null, address: null, mapUrl: null, whatsappEnabled: true });
  assert.equal(toContact({ phone: "x", email: null, address: null, mapUrl: null, whatsappEnabled: false }).whatsappEnabled, false);
});

test("contact form accepts blank optional fields and trims values", () => {
  const cleaned = gymContactSchema.validate({ ...valid, email: "  Gym@Example.com ", phone: "", address: "", mapUrl: "", whatsappEnabled: false });
  assert.equal(cleaned.error, undefined);
  assert.equal(cleaned.value.email, "gym@example.com");
});

test("phone numbers must look like phone numbers", () => {
  assert.ok(gymContactSchema.validate({ ...valid, phone: "call me" }).error);
  assert.ok(gymContactSchema.validate({ ...valid, phone: "12" }).error);
  assert.equal(gymContactSchema.validate({ ...valid, phone: "+91 (00000) 00001" }).error, undefined);
});

test("email must be an email address", () => {
  assert.ok(gymContactSchema.validate({ ...valid, email: "not-an-email" }).error);
});

test("only HTTPS Google Maps links are accepted", () => {
  assert.equal(isGoogleMapsUrl("https://www.google.com/maps/place/Chandigarh"), true);
  assert.equal(isGoogleMapsUrl("https://maps.app.goo.gl/abc"), true);
  assert.equal(isGoogleMapsUrl("https://goo.gl/maps/abc"), true);
  assert.equal(isGoogleMapsUrl("http://maps.google.com/?q=x"), false, "plain HTTP");
  assert.equal(isGoogleMapsUrl("https://www.google.com/search?q=gym"), false, "not a maps path");
  assert.equal(isGoogleMapsUrl("https://evil.example.com/maps"), false);
  assert.equal(isGoogleMapsUrl("javascript:alert(1)"), false);
  assert.ok(gymContactSchema.validate({ ...valid, mapUrl: "https://evil.example.com/" }).error);
});

test("every contact field is required in the save request (use null or empty to clear)", () => {
  const { phone, ...rest } = valid;
  assert.ok(gymContactSchema.validate(rest).error);
  assert.equal(gymContactSchema.validate({ ...valid, phone: null }).error, undefined);
});
