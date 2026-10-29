import { useEffect } from "react";
import { analyticsSessionKey, analyticsVisitorKey, getStoredId } from "../services/analytics.js";
import { apiCalls } from "../services/api.js";

// Records a page view only after the visitor has accepted analytics.
export function usePageViewAnalytics(path, consent) {
  useEffect(() => {
    if (consent !== "accepted" || path.startsWith("/reset-password")) return;
    const params = new URLSearchParams(window.location.search);
    apiCalls.analytics.event({
      eventId: crypto.randomUUID(),
      visitorId: getStoredId(localStorage, analyticsVisitorKey),
      sessionId: getStoredId(sessionStorage, analyticsSessionKey),
      type: "page_view",
      page: window.location.pathname,
      source: params.get("source") || undefined,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      consent: true,
    }).catch((error) => console.error("Consent-based analytics event was not recorded.", error));
  }, [consent, path]);
}
