import { useCallback, useEffect, useState } from "react";
import { getApiError } from "../services/api.js";

export function useLoad(loader, dependencies = []) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loader();
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getApiError(error) }));
    }
  // The caller controls refetching through its dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}
