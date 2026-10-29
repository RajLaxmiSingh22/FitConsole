import { useEffect, useState } from "react";
import { apiCalls } from "../services/api.js";

export function useApiStatus() {
  const [apiStatus, setApiStatus] = useState("checking");
  useEffect(() => {
    let mounted = true;
    apiCalls.health().then(({ data }) => {
      if (mounted) setApiStatus(data.status === "ok" ? "connected" : "unavailable");
    }).catch(() => {
      if (mounted) setApiStatus("unavailable");
    });
    return () => { mounted = false; };
  }, []);
  return apiStatus;
}
