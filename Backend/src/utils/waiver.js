import { WaiverAcceptance } from "../models/index.js";

function isPlaceholderWaiver(text) {
  return /^(replace_with_|placeholder\b|todo\b)/i.test(text);
}

export function assertCurrentWaiverConfigured(environment = process.env) {
  const text = environment.WAIVER_TEXT?.trim();
  if (
    environment.NODE_ENV === "production"
    && (!text || isPlaceholderWaiver(text))
  ) {
    throw new Error("WAIVER_TEXT must contain the approved training waiver in production.");
  }
}

export async function hasAcceptedCurrentWaiver(clientId, AcceptanceModel = WaiverAcceptance) {
  const text = process.env.WAIVER_TEXT?.trim();
  if (!text || isPlaceholderWaiver(text)) return false;
  const version = process.env.WAIVER_VERSION ?? "1";
  return Boolean(await AcceptanceModel.findOne({
    where: { clientId, agreementVersion: version },
    attributes: ["id"],
  }));
}
