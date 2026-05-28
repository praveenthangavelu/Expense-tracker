import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../common/Button";

const Pagination = ({ pagination, onPageChange }) => {
  const { page = 1, limit = 20, total = 0, pages = 1 } = pagination;
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);

  // Generate pagination links
  const getPageNumbers = () => {
    const pageNumbers = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (page <= 4) {
        pageNumbers.push(1, 2, 3, 4, 5, "...", pages);
      } else if (page >= pages - 3) {
        pageNumbers.push(1, "...", pages - 4, pages - 3, pages - 2, pages - 1, pages);
      } else {
        pageNumbers.push(1, "...", page - 1, page, page + 1, "...", pages);
      }
    }
    return pageNumbers;
  };

  const visiblePages = getPageNumbers();

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:flex-row shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold text-[var(--text-dim)] font-mono">
        Showing <span className="text-[var(--text-secondary)]">{start}</span>–<span className="text-[var(--text-secondary)]">{end}</span> of <span className="text-[var(--text-secondary)]">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-9 px-3 text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1 shrink-0" />
          Prev
        </Button>
        
        <div className="hidden items-center gap-1.5 sm:flex">
          {visiblePages.map((value, index) => {
            if (value === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="h-9 w-9 flex items-center justify-center text-xs font-mono text-[var(--text-ghost)]"
                >
                  ...
                </span>
              );
            }
            const isCurrent = value === page;
            return (
              <button
                key={`page-${value}`}
                type="button"
                onClick={() => onPageChange(value)}
                className={`h-9 w-9 rounded-lg text-xs font-semibold font-mono transition-all duration-200 select-none cursor-pointer ${
                  isCurrent
                    ? "bg-[var(--electric-soft)] text-[var(--electric)] border border-[var(--electric)]/20 shadow-[var(--shadow-glow-electric)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
        
        <span className="text-xs font-mono font-semibold text-[var(--text-secondary)] sm:hidden">
          {page} <span className="text-[var(--text-ghost)]">/</span> {pages || 1}
        </span>

        <Button
          variant="ghost"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="h-9 px-3 text-xs"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1 shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
