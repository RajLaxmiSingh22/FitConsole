import { useEffect, useState } from "react";
import { apiCalls, responseData } from "../services/api.js";

const EVENT = "fitconsole:profile-updated";

// The signed-in user's profile (name, photo version, coaching flag), shared across the shell and profile pages.
export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let mounted = true;
    apiCalls.profile.get().then((response) => { if (mounted) setProfile(responseData(response)); }).catch((requestError) => { if (mounted) setError(requestError); });
    const listen = (event) => setProfile(event.detail);
    window.addEventListener(EVENT, listen);
    return () => { mounted = false; window.removeEventListener(EVENT, listen); };
  }, []);
  // Saves a fresh profile response and tells every other listener (e.g. the top bar avatar).
  function applyProfile(next) {
    setProfile(next);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }
  return { profile, error, applyProfile };
}
