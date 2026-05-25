import Button from "../common/Button";

const Pagination = ({ pagination, onPageChange }) => {
  const { page = 1, limit = 20, total = 0, pages = 1 } = pagination;
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);

  const visiblePages = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((value) => Math.abs(value - page) <= 2 || value === 1 || value === pages)
    .slice(0, 7);

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row">
      <p className="text-sm text-slate-400">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {visiblePages.map((value, index) => (
            <button
              key={`${value}-${index}`}
              type="button"
              onClick={() => onPageChange(value)}
              className={`h-9 min-w-9 rounded-xl px-3 text-sm font-semibold transition ${
                value === page
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-400 sm:hidden">
          {page} / {pages || 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
