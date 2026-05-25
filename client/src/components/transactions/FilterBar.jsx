import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, X } from "lucide-react";
import clsx from "clsx";

import Button from "../common/Button";
import { useTransactions } from "../../context/TransactionContext";
import { useDebounce } from "../../hooks/useDebounce";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const types = [
  { label: "All", value: "" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

const FilterBar = () => {
  const { filters, setFilters, categories } = useTransactions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setFilters({ category: debouncedSearch || filters.category });
    // Search is local category search because backend supports category filtering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const activeCount = useMemo(
    () =>
      [filters.type, filters.category, filters.startDate, filters.endDate].filter(Boolean)
        .length,
    [filters],
  );

  const content = (
    <div className="grid gap-3 lg:grid-cols-[auto_1fr_1fr_auto]">
      <div className="relative flex rounded-2xl bg-white/[0.04] p-1">
        {types.map((type) => (
          <button
            key={type.label}
            type="button"
            onClick={() => setFilters({ type: type.value })}
            className={clsx(
              "relative z-10 rounded-xl px-4 py-2 text-sm font-semibold transition",
              filters.type === type.value ? "text-slate-950" : "text-slate-400",
            )}
          >
            {filters.type === type.value && (
              <motion.span
                layoutId="type-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-emerald-400"
              />
            )}
            {type.label}
          </button>
        ))}
      </div>

      <label className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search category"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:ring-emerald-400"
        />
      </label>

      <select
        value={filters.category}
        onChange={(event) => setFilters({ category: event.target.value })}
        className="rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-emerald-400 focus:ring-emerald-400"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category._id} value={category.name}>
            {category.icon} {category.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={filters.startDate}
          onChange={(event) => setFilters({ startDate: event.target.value })}
          className="rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-emerald-400 focus:ring-emerald-400"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(event) => setFilters({ endDate: event.target.value })}
          className="rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-emerald-400 focus:ring-emerald-400"
        />
      </div>
      {(filters.startDate || filters.endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ startDate: "", endDate: "" })}
        >
          Clear dates
        </Button>
      )}
    </div>
  );

  return (
    <div className="glass rounded-3xl p-4">
      {isMobile && (
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          {activeCount ? (
            <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs text-slate-950">
              {activeCount}
            </span>
          ) : (
            <X className="h-4 w-4 opacity-40" />
          )}
        </Button>
      )}
      {isMobile ? (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-4"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        content
      )}
    </div>
  );
};

export default FilterBar;
