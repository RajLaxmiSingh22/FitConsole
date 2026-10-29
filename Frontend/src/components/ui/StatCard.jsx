export default function StatCard({ label, value, detail, tone = "" }) {
  return (
    <article className={`stat-card ${tone ? `stat-card--${tone}` : ""}`}>
      <p className="overline">{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </article>
  );
}
