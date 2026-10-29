import { getApiError } from "../../services/api.js";

export default function Notice({ error, onDismiss, tone = "error" }) {
  if (!error) return null;
  const message = typeof error === "string" ? error : getApiError(error);
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      {onDismiss && <button className="icon-button" onClick={onDismiss} aria-label="Dismiss error">×</button>}
    </div>
  );
}
