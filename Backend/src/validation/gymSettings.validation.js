import Joi from "joi";
import { stripUnknownFields } from "./common.validation.js";

// Map links must be HTTPS links to Google Maps, so the owner cannot publish arbitrary URLs.
export function isGoogleMapsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname;
  if (host === "maps.google.com" || host === "maps.app.goo.gl") return true;
  if (host === "google.com" || host === "www.google.com" || host === "goo.gl") return url.pathname.startsWith("/maps");
  return false;
}

// Phone: digits with optional leading + and spaces, brackets or dashes (7–20 characters).
export const gymContactSchema = stripUnknownFields(Joi.object({
  phone: Joi.string().trim().pattern(/^\+?[0-9 ()-]{7,20}$/, "phone number").allow("", null).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).allow("", null).required(),
  address: Joi.string().trim().max(300).allow("", null).required(),
  mapUrl: Joi.string().trim().max(500).custom((value, helpers) => (isGoogleMapsUrl(value) ? value : helpers.message("Use a Google Maps link that starts with https://"))).allow("", null).required(),
  whatsappEnabled: Joi.boolean().required(),
}));
