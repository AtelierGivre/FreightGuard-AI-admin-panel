/** Minimal previous/next control driven by the API meta block. */
export default function Pagination({ meta, onPage, disabled = false }) {
  if (!meta || (meta.pages || 1) <= 1) return null;

  const page = meta.page || 1;
  const pages = meta.pages || 1;

  return (
    <div className="pagination">
      <span className="text-sm text-muted">
        Page {page} of {pages} · {meta.total ?? 0} records
      </span>
      <div className="flex gap-8">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={disabled || page >= pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
