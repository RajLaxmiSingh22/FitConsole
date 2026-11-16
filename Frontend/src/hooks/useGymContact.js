import { useEffect, useState } from "react";
import { apiCalls, responseData } from "../services/api.js";
import { withPlaceholders } from "../utils/gymContact.js";

// Public contact details from the API, with placeholders until loaded or saved.
export function useGymContact() {
  const [state, setState] = useState({ loading: true, contact: null });
  useEffect(() => {
    let active = true;
    apiCalls.gymSettings.publicContact()
      .then((response) => { if (active) setState({ loading: false, contact: responseData(response) }); })
      .catch(() => { if (active) setState({ loading: false, contact: null }); });
    return () => { active = false; };
  }, []);
  return { loading: state.loading, ...withPlaceholders(state.contact) };
}

export { telLink, whatsappLink } from "../utils/gymContact.js";
