import { WaiverAcceptance, WaiverDocument } from "../models/index.js";
import { DEFAULT_WAIVER_TEXT, DEFAULT_WAIVER_VERSION } from "./defaultWaiver.js";

function isPlaceholderWaiver(text) {
  return /^(replace_with_|placeholder\b|todo\b)/i.test(text);
}

// The approved waiver text from the environment, or null while WAIVER_TEXT is missing or still a placeholder.
export function getCurrentWaiverText(environment = process.env) {
  const text = environment.WAIVER_TEXT?.trim();
  return text && !isPlaceholderWaiver(text) ? text : null;
}

export function getCurrentWaiverVersion(environment = process.env) {
  return environment.WAIVER_VERSION ?? "1";
}

// The waiver members must accept: the newest owner-published version, then WAIVER_TEXT from the
// environment, then the built-in standard agreement, so members are never blocked from paying.
export async function getCurrentWaiver({ DocumentModel = WaiverDocument, environment = process.env, transaction } = {}) {
  const document = await DocumentModel.findOne({ order: [["createdAt", "DESC"]], transaction });
  if (document) {
    return { version: document.version, text: document.text, source: "app", publishedAt: document.createdAt };
  }
  const text = getCurrentWaiverText(environment);
  if (text) return { version: getCurrentWaiverVersion(environment), text, source: "environment", publishedAt: null };
  return { version: DEFAULT_WAIVER_VERSION, text: DEFAULT_WAIVER_TEXT, source: "default", publishedAt: null };
}

// Next version number for an owner-published waiver; stays above any numeric version already in use.
export function nextWaiverVersion(existingVersions, current) {
  const numbers = [...existingVersions, current?.version]
    .map((version) => Number.parseInt(version, 10))
    .filter(Number.isFinite);
  return String(numbers.length ? Math.max(...numbers) + 1 : 1);
}

// Reminds the owner in production that members are accepting the built-in standard agreement.
export function warnIfWaiverMissing(waiver, environment = process.env) {
  if (environment.NODE_ENV === "production" && waiver?.source === "default") {
    console.warn("Members are accepting the built-in standard agreement. Publish the gym's own agreement from Owner → Gym agreement.");
  }
}

export async function hasAcceptedCurrentWaiver(clientId, AcceptanceModel = WaiverAcceptance, options = {}) {
  const waiver = await getCurrentWaiver(options);
  if (!waiver) return false;
  return Boolean(await AcceptanceModel.findOne({
    where: { clientId, agreementVersion: waiver.version },
    attributes: ["id"],
  }));
}
