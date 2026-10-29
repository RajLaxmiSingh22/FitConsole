import Button from "./Button.jsx";

export default function Pager({ pagination, onPage, disabled = false }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <nav className="pager" aria-label="Pagination">
      <Button variant="ghost" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>← Previous</Button>
      <span className="muted">Page {page} of {totalPages} · {total} records</span>
      <Button variant="ghost" disabled={disabled || page >= totalPages} onClick={() => onPage(page + 1)}>Next →</Button>
    </nav>
  );
}
