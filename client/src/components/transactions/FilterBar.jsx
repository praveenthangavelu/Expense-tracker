import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, X, ChevronDown, Calendar } from "lucide-react";
import clsx from "clsx";

import Button from "../common/Button";
import { useTransactions } from "../../context/TransactionContext";
import { useDebounce } from "../../hooks/useDebounce";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { CATEGORY_EMOJIS } from "../../utils/constants";

const types = [
  { label: "All", value: "" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

const FilterBar = () => {
  const { filters, setFilters, categories } = useTransactions();
  const [search, setSearch] = useState(filters.search || "");
  const [open, setOpen] = useState(false); // Mobile sheet open state
  const [catOpen, setCatOpen] = useState(false); // Category dropdown open state
  const isMobile = useMediaQuery("(max-width: 767px)");
  const debouncedSearch = useDebounce(search, 300);
  const dropdownRef = useRef(null);

  // Sync debounced search with filters context
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync search state if filters cleared from outside
  useEffect(() => {
    setSearch(filters.search || "");
  }, [filters.search]);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeCount = useMemo(() => {
    return [
      filters.type,
      filters.category,
      filters.startDate,
      filters.endDate,
      filters.search,
    ].filter(Boolean).length;
  }, [filters]);

  const hasFiltersActive = activeCount > 0;

  const currentCategoryName = useMemo(() => {
    if (!filters.category) return "All Categories";
    return filters.category;
  }, [filters.category]);

  const currentCategoryIcon = useMemo(() => {
    if (!filters.category) return null;
    const cat = categories.find((c) => c.name === filters.category);
    return cat?.icon || CATEGORY_EMOJIS[filters.category] || "📌";
  }, [filters.category, categories]);

  const handleClearAll = () => {
    setFilters({
      type: "",
      category: "",
      startDate: "",
      endDate: "",
      search: "",
    });
    setSearch("");
  };

  const handleRemoveFilter = (key) => {
    if (key === "search") {
      setSearch("");
    }
    setFilters({ [key]: "" });
  };

  const filterChips = useMemo(() => {
    const chips = [];
    if (filters.type) {
      chips.push({ key: "type", label: `Type: ${filters.type}`, value: filters.type });
    }
    if (filters.category) {
      chips.push({ key: "category", label: `Category: ${filters.category}`, value: filters.category });
    }
    if (filters.search) {
      chips.push({ key: "search", label: `Search: "${filters.search}"`, value: filters.search });
    }
    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? new Date(filters.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "...";
      const end = filters.endDate ? new Date(filters.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "...";
      chips.push({ key: "dateRange", label: `${start} → ${end}`, isDateRange: true });
    }
    return chips;
  }, [filters]);

  const content = (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-[auto_1fr_1.2fr_auto_auto] items-center">
        {/* 1. TYPE TOGGLE */}
        <div className="relative flex rounded-xl bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] w-full sm:w-fit h-[44px] items-center">
          {types.map((type) => (
            <button
              key={type.label}
              type="button"
              onClick={() => setFilters({ type: type.value })}
              className={clsx(
                "relative z-10 rounded-lg h-9 px-5 text-xs font-semibold transition-colors duration-200 cursor-pointer flex-1 sm:flex-initial flex items-center justify-center min-w-[70px]",
                filters.type === type.value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {filters.type === type.value && (
                <motion.span
                  layoutId="type-pill-indicator"
                  className="absolute inset-0 -z-10 rounded-lg bg-[var(--electric-soft)] border border-[var(--electric)]/30 shadow-[var(--shadow-glow-electric)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {type.label}
            </button>
          ))}
        </div>

        {/* 2. SEARCH BAR */}
        <label className="relative block w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            className="w-full h-[44px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] pl-10 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none transition-all duration-200"
          />
        </label>

        {/* 3. CATEGORY DROPDOWN (Custom floating menu) */}
        <div className="relative w-full" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setCatOpen(!catOpen)}
            className="w-full h-[44px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-4 text-xs text-[var(--text-primary)] flex items-center justify-between hover:border-[var(--border-strong)] transition-all duration-200 focus:outline-none"
          >
            <span className="flex items-center gap-2">
              {currentCategoryIcon && <span>{currentCategoryIcon}</span>}
              <span className={clsx(filters.category ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)]")}>
                {currentCategoryName}
              </span>
            </span>
            <ChevronDown className={clsx("h-4 w-4 text-[var(--text-dim)] transition-transform duration-200", catOpen && "rotate-185")} />
          </button>

          <AnimatePresence>
            {catOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 right-0 mt-2 z-30 max-h-60 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-lg)] scrollbar-none"
              >
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ category: "" });
                    setCatOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => {
                      setFilters({ category: category.name });
                      setCatOpen(false);
                    }}
                    className={clsx(
                      "w-full rounded-lg px-3 py-2 text-left text-xs transition-all flex items-center justify-between hover:bg-[var(--bg-hover)]",
                      filters.category === category.name ? "bg-[var(--electric-soft)] text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{category.icon || CATEGORY_EMOJIS[category.name] || "📌"}</span>
                      <span>{category.name}</span>
                    </span>
                    {category.type && (
                      <span className={clsx("text-[9px] uppercase tracking-wider font-semibold opacity-60", category.type === "income" ? "text-[var(--mint)]" : "text-[var(--flame)]")}>
                        {category.type}
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. DATE RANGE */}
        <div className="flex items-center gap-2 w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 h-[44px] focus-within:border-[var(--border-focus)] transition-all duration-200">
          <Calendar className="h-4 w-4 text-[var(--text-dim)] shrink-0" />
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters({ startDate: event.target.value })}
            className="w-full border-0 bg-transparent text-xs text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer"
          />
          <span className="text-[var(--text-dim)] font-mono shrink-0 select-none">→</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters({ endDate: event.target.value })}
            className="w-full border-0 bg-transparent text-xs text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer"
          />
        </div>

        {/* 5. QUICK CLEAR */}
        {hasFiltersActive && (
          <Button
            variant="ghost"
            onClick={handleClearAll}
            className="w-full sm:w-auto h-[44px] text-xs font-semibold px-4 flex items-center justify-center gap-1.5 hover:text-[var(--flame)] hover:border-[var(--flame)]/20 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* 5. ACTIVE FILTER CHIPS */}
      {hasFiltersActive && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-dim)] mr-1">Active:</span>
          {filterChips.map((chip) => (
            <div
              key={chip.key}
              className="h-6 rounded-full bg-[var(--electric-soft)] border border-[var(--electric)]/20 pl-3 pr-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => {
                  if (chip.isDateRange) {
                    handleRemoveFilter("startDate");
                    handleRemoveFilter("endDate");
                  } else {
                    handleRemoveFilter(chip.key);
                  }
                }}
                className="rounded-full hover:bg-[var(--bg-hover)] p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-semibold text-[var(--electric)] hover:text-[var(--text-primary)] transition-colors ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-[var(--shadow-sm)] relative">
      {isMobile ? (
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="w-full h-11 justify-between border border-[var(--border-default)] px-4 rounded-xl hover:bg-[var(--bg-hover)]"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="flex items-center gap-2 font-semibold">
              <Filter className="h-4 w-4 text-[var(--electric)]" />
              Filters
            </span>
            {activeCount ? (
              <span className="rounded-full bg-[var(--electric)] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-glow-electric">
                {activeCount}
              </span>
            ) : (
              <ChevronDown className={clsx("h-4 w-4 opacity-40 transition-transform duration-200", open && "rotate-180")} />
            )}
          </Button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        content
      )}
    </div>
  );
};

export default FilterBar;
