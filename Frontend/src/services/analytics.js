export const analyticsConsentKey = "fitconsole.analyticsConsent";
export const analyticsVisitorKey = "fitconsole.analyticsVisitorId";
export const analyticsSessionKey = "fitconsole.analyticsSessionId";

export function readAnalyticsConsent() {
  try {
    return localStorage.getItem(analyticsConsentKey) ?? "";
  } catch {
    return "";
  }
}

export function getStoredId(storage, key) {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}
