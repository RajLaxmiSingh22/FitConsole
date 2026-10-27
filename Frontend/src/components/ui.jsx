import { getApiError } from "../api.js";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="overline">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, eyebrow, action, className = "", children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || eyebrow || action) && (
        <div className="panel-heading">
          <div>
            {eyebrow && <p className="overline">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, detail, tone = "" }) {
  return (
    <article className={`stat-card ${tone ? `stat-card--${tone}` : ""}`}>
      <p className="overline">{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </article>
  );
}

export function StatusPill({ children, tone = "neutral" }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function Notice({ error, onDismiss, tone = "error" }) {
  if (!error) return null;
  const message = typeof error === "string" ? error : getApiError(error);
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      {onDismiss && <button className="icon-button" onClick={onDismiss} aria-label="Dismiss error">×</button>}
    </div>
  );
}

export function EmptyState({ title, detail, action }) {
  return (
    <div className="empty-state">
      <span className="empty-mark">FC</span>
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading your workspace…" }) {
  return <div className="loading-state"><span className="loader" />{label}</div>;
}

export function Field({ label, children, className = "" }) {
  return <label className={`field ${className}`.trim()}><span>{label}</span>{children}</label>;
}

export function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`button button--${variant} ${className}`.trim()} {...props} />;
}

export function currency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function dateLabel(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", options).format(date);
}

export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "FC";
}

export function responseData(response) {
  return response?.data?.data;
}
