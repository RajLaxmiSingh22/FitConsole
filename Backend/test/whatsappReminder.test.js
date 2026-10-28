import assert from "node:assert/strict";
import test from "node:test";
import { buildReminderMessage, buildWhatsAppLink, normalizeIndianMobile } from "../src/utils/whatsappReminder.js";

test("Indian mobile numbers normalize to 10 digits", () => {
  assert.equal(normalizeIndianMobile("+91 98765-43210"), "9876543210");
  assert.equal(normalizeIndianMobile("09876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("9876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("12345"), null);
  assert.equal(normalizeIndianMobile("5876543210"), null);
  assert.equal(normalizeIndianMobile(null), null);
});

test("reminder link encodes the message for WhatsApp click-to-chat", () => {
  const message = buildReminderMessage({
    name: "Asha",
    amountDue: 2500,
    course: "Boxing",
    dueDate: "2026-11-05",
    payUrl: "https://app.example.com/?section=Membership",
  });
  assert.match(message, /₹2,500\.00 is due for your Boxing membership \(due 5 Nov 2026\)/);
  const link = buildWhatsAppLink("9876543210", message);
  assert.ok(link.startsWith("https://wa.me/919876543210?text="));
  assert.equal(decodeURIComponent(link.split("text=")[1]), message);
});
