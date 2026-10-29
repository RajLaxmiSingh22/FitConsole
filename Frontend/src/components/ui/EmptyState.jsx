export default function EmptyState({ title, detail, action }) {
  return (
    <div className="empty-state">
      <span className="empty-mark">FC</span>
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  );
}
