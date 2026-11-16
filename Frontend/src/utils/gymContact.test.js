import assert from "node:assert/strict";
import test from "node:test";
import { telLink, whatsappLink, withPlaceholders } from "./gymContact.js";

test("unsaved details show placeholders and get no links", () => {
  const contact = withPlaceholders(null);
  assert.equal(contact.isSaved, false);
  assert.equal(whatsappLink(contact), null);
});

test("a saved WhatsApp number becomes a wa.me link without symbols", () => {
  const contact = withPlaceholders({ phone: "+91 73090 41028", email: null, address: "Chandigarh, India", mapUrl: null, whatsappEnabled: true });
  assert.equal(whatsappLink(contact), "https://wa.me/917309041028");
  assert.equal(telLink("+91 73090 41028"), "tel:+917309041028");
});

test("switching WhatsApp off removes its link", () => {
  const contact = withPlaceholders({ phone: "+91 73090 41028", whatsappEnabled: false });
  assert.equal(whatsappLink(contact), null);
});
