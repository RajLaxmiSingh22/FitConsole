import { useEffect, useState } from "react";
import { apiCalls, hasSessionHint, setSession } from "../services/api.js";

// Restores the cookie session on load and tracks expiry/sign-in events.
export function useSession() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAccessNotice("Your session expired. Please sign in again.");
    };
    const handleAuthenticated = () => setAccessNotice("");
    window.addEventListener("fitconsole:session-expired", handleSessionExpired);
    window.addEventListener("fitconsole:authenticated", handleAuthenticated);
    return () => {
      window.removeEventListener("fitconsole:session-expired", handleSessionExpired);
      window.removeEventListener("fitconsole:authenticated", handleAuthenticated);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!hasSessionHint()) {
      setAuthChecked(true);
      return () => { mounted = false; };
    }
    // A page load loses the in-memory CSRF token, so restore by rotating the refresh cookie.
    apiCalls.auth.refresh().then((session) => {
      if (mounted) setUser(session.user);
    }).catch(() => {
      setSession(null);
    }).finally(() => {
      if (mounted) setAuthChecked(true);
    });
    return () => { mounted = false; };
  }, []);

  function logout() {
    apiCalls.auth.logout().catch(() => {
      // Cookies expire on their own; local state is cleared regardless.
    });
    setSession(null);
    setUser(null);
  }

  return { user, setUser, authChecked, accessNotice, setAccessNotice, logout };
}
