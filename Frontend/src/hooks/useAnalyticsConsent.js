import { useEffect, useState } from "react";
import { analyticsConsentKey, readAnalyticsConsent } from "../services/analytics.js";

export function useAnalyticsConsent() {
  const [consent, setConsent] = useState(readAnalyticsConsent);
  const [showSettings, setShowSettings] = useState(() => !readAnalyticsConsent());
  useEffect(() => {
    const openPreferences = () => setShowSettings(true);
    window.addEventListener("fitconsole:analytics-preferences", openPreferences);
    return () => window.removeEventListener("fitconsole:analytics-preferences", openPreferences);
  }, []);
  function choose(choice) {
    localStorage.setItem(analyticsConsentKey, choice);
    setConsent(choice);
    setShowSettings(false);
  }
  return { consent, showSettings, choose, close: () => setShowSettings(false) };
}
