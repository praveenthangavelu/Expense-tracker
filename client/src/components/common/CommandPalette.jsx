import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  PlusCircle,
  Camera,
  Upload,
  Target,
  Repeat,
  LayoutDashboard,
  Receipt,
  Lightbulb,
  Users,
  Settings,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTransactions } from "../../context/TransactionContext";
import clsx from "clsx";

// Static commands
const QUICK_ACTIONS = [
  {
    id: "add_expense",
    title: "Add Expense",
    subtitle: "Log a manual expense transaction",
    icon: PlusCircle,
    shortcut: "N",
    action: () => {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "expense" } })
      );
    },
  },
  {
    id: "add_income",
    title: "Add Income",
    subtitle: "Log a manual income transaction",
    icon: PlusCircle,
    shortcut: "I",
    action: () => {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "income" } })
      );
    },
  },
  {
    id: "scan_receipt",
    title: "Scan Receipt",
    subtitle: "Auto-parse details from receipt OCR",
    icon: Camera,
    shortcut: "S",
    action: () => {
      window.dispatchEvent(new CustomEvent("open-receipt-scanner"));
    },
  },
  {
    id: "import_transactions",
    title: "Import Transactions",
    subtitle: "Upload CSV/SMS dump config",
    icon: Upload,
    action: (navigate) => navigate("/settings?tab=import"),
  },
  {
    id: "new_goal",
    title: "New Savings Goal",
    subtitle: "Create a new target savings budget",
    icon: Target,
    action: (navigate) => navigate("/budget-goals?tab=goals"),
  },
  {
    id: "add_recurring",
    title: "Add Recurring",
    subtitle: "Setup automated subscription bills",
    icon: Repeat,
    action: (navigate) => navigate("/budget-goals?tab=recurring"),
  },
];

const NAVIGATION_ITEMS = [
  { id: "nav_dashboard", title: "Go to Dashboard", subtitle: "/dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "nav_transactions", title: "Go to Transactions", subtitle: "/transactions", icon: Receipt, path: "/transactions" },
  { id: "nav_budget", title: "Go to Budget & Goals", subtitle: "/budget-goals", icon: Target, path: "/budget-goals" },
  { id: "nav_insights", title: "Go to Insights", subtitle: "/insights", icon: Lightbulb, path: "/insights" },
  { id: "nav_family", title: "Go to Family", subtitle: "/family", icon: Users, path: "/family" },
  { id: "nav_settings", title: "Go to Settings", subtitle: "/settings", icon: Settings, path: "/settings" },
];

const SHORTCUTS = [
  { keys: ["Cmd+K", "Ctrl+K"], desc: "Toggle Command palette" },
  { keys: ["N"], desc: "New manual expense" },
  { keys: ["I"], desc: "New manual income" },
  { keys: ["S"], desc: "Scan receipt scanner" },
  { keys: ["/"], desc: "Focus search input" },
  { keys: ["Esc"], desc: "Dismiss modal" },
];

const RECENT_KEY = "expenseflow_recent_commands";

const CommandPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { transactions } = useTransactions();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recents, setRecents] = useState([]);
  const scrollContainerRef = useRef(null);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(handler);
  }, [query]);

  // Load recents
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(RECENT_KEY);
        if (stored) setRecents(JSON.parse(stored));
      } catch {
        // Ignored
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Track select history
  const trackRecent = (commandId) => {
    let updated = [commandId, ...recents.filter((id) => id !== commandId)].slice(0, 3);
    setRecents(updated);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  // Filter commands
  const filteredQuickActions = useMemo(() => {
    if (!debouncedQuery) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        cmd.subtitle.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
  }, [debouncedQuery]);

  const filteredNavActions = useMemo(() => {
    if (!debouncedQuery) return [];
    return NAVIGATION_ITEMS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        cmd.subtitle.toLowerCase().includes(debouncedQuery.toLowerCase())
    );
  }, [debouncedQuery]);

  // Filter matching transactions
  const searchedTransactions = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return transactions
      .filter((tx) => {
        const noteMatch = tx.note?.toLowerCase().includes(debouncedQuery.toLowerCase());
        const catMatch = tx.category?.toLowerCase().includes(debouncedQuery.toLowerCase());
        const amtMatch = String(tx.amount).includes(debouncedQuery);
        return noteMatch || catMatch || amtMatch;
      })
      .slice(0, 5);
  }, [debouncedQuery, transactions]);

  // Combined flat list of currently active results for key navigation
  const flatResults = useMemo(() => {
    const items = [];

    // Recents
    if (!debouncedQuery && recents.length > 0) {
      recents.forEach((id) => {
        const cmd = QUICK_ACTIONS.find((q) => q.id === id) || NAVIGATION_ITEMS.find((n) => n.id === id);
        if (cmd) items.push({ type: "recent", data: cmd });
      });
    }

    // Quick Actions
    filteredQuickActions.forEach((cmd) => {
      items.push({ type: "quick", data: cmd });
    });

    // Nav Actions
    filteredNavActions.forEach((cmd) => {
      items.push({ type: "nav", data: cmd });
    });

    // Transactions
    searchedTransactions.forEach((tx) => {
      items.push({ type: "transaction", data: tx });
    });

    return items;
  }, [debouncedQuery, recents, filteredQuickActions, filteredNavActions, searchedTransactions]);

  // Execute selected item
  const handleSelect = (item) => {
    if (!item) return;

    if (item.type === "quick" || item.type === "recent") {
      const cmd = item.data;
      trackRecent(cmd.id);
      if (cmd.action) {
        cmd.action(navigate);
      } else if (cmd.path) {
        navigate(cmd.path);
      }
    } else if (item.type === "nav") {
      trackRecent(item.data.id);
      navigate(item.data.path);
    } else if (item.type === "transaction") {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", {
          detail: { transaction: item.data },
        })
      );
    }

    onClose();
  };

  // Keyboard navigation inside list
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatResults.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector(".palette-active-item");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        {/* Backdrop filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[var(--modal-overlay)] backdrop-blur-sm"
        />

        {/* Modal layout */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette modal"
          initial={{ scale: shouldReduceMotion ? 1 : 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="relative w-full max-w-[560px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header Search Field */}
          <div className="flex items-center gap-3 px-4 border-b border-[var(--border-subtle)] h-12">
            <Search className="h-4.5 w-4.5 text-[var(--text-dim)] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search transactions..."
              className="w-full bg-transparent border-none p-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-0"
            />
            <span className="text-[10px] font-mono border border-[var(--border-strong)] rounded px-1.5 py-0.5 text-[var(--text-dim)] font-bold select-none">
              ESC
            </span>
          </div>

          {/* Results Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[400px] scrollbar-none"
          >
            {flatResults.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
                No matching results for "{query}"
              </div>
            ) : (
              <>
                {/* 1. RECENT SECTION */}
                {!debouncedQuery && recents.length > 0 && (
                  <div>
                    <h4 className="px-3 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 flex items-center gap-1 select-none">
                      <Clock className="h-3 w-3" /> Recently Used
                    </h4>
                    <div className="space-y-0.5">
                      {flatResults
                        .filter((item) => item.type === "recent")
                        .map((item, flatIdx) => {
                          const cmd = item.data;
                          const Icon = cmd.icon;
                          const isSelected = selectedIndex === flatIdx;
                          return (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                              className={clsx(
                                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                isSelected ? "bg-[var(--electric-soft)] palette-active-item" : "hover:bg-[var(--bg-hover)]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className={clsx("h-4 w-4 shrink-0", isSelected ? "text-[var(--electric)]" : "text-[var(--text-secondary)]")} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{cmd.title}</p>
                                  <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{cmd.subtitle}</p>
                                </div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-[var(--text-dim)] opacity-40" />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. ACTIONS SECTION */}
                {filteredQuickActions.length > 0 && (
                  <div>
                    <h4 className="px-3 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 select-none">
                      Quick Actions
                    </h4>
                    <div className="space-y-0.5">
                      {flatResults
                        .map((item, idx) => ({ item, idx }))
                        .filter(({ item }) => item.type === "quick")
                        .map(({ item, idx }) => {
                          const cmd = item.data;
                          const Icon = cmd.icon;
                          const isSelected = selectedIndex === idx;
                          return (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={clsx(
                                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                isSelected ? "bg-[var(--electric-soft)] palette-active-item" : "hover:bg-[var(--bg-hover)]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className={clsx("h-4 w-4 shrink-0", isSelected ? "text-[var(--electric)]" : "text-[var(--text-secondary)]")} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{cmd.title}</p>
                                  <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{cmd.subtitle}</p>
                                </div>
                              </div>
                              {cmd.shortcut && (
                                <span className="text-[9px] font-mono border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--text-dim)] font-bold select-none">
                                  {cmd.shortcut}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 3. NAVIGATION SECTION */}
                {filteredNavActions.length > 0 && (
                  <div>
                    <h4 className="px-3 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 select-none">
                      Navigation
                    </h4>
                    <div className="space-y-0.5">
                      {flatResults
                        .map((item, idx) => ({ item, idx }))
                        .filter(({ item }) => item.type === "nav")
                        .map(({ item, idx }) => {
                          const cmd = item.data;
                          const Icon = cmd.icon;
                          const isSelected = selectedIndex === idx;
                          return (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={clsx(
                                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                isSelected ? "bg-[var(--electric-soft)] palette-active-item" : "hover:bg-[var(--bg-hover)]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className={clsx("h-4 w-4 shrink-0", isSelected ? "text-[var(--electric)]" : "text-[var(--text-secondary)]")} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{cmd.title}</p>
                                  <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{cmd.subtitle}</p>
                                </div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-[var(--text-dim)] opacity-40" />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 4. TRANSACTION SEARCH RESULTS */}
                {searchedTransactions.length > 0 && (
                  <div>
                    <h4 className="px-3 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1.5 select-none">
                      Search Transactions
                    </h4>
                    <div className="space-y-0.5">
                      {flatResults
                        .map((item, idx) => ({ item, idx }))
                        .filter(({ item }) => item.type === "transaction")
                        .map(({ item, idx }) => {
                          const tx = item.data;
                          const isSelected = selectedIndex === idx;
                          const isIncome = tx.type === "income";

                          return (
                            <button
                              key={tx._id}
                              type="button"
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={clsx(
                                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                isSelected ? "bg-[var(--electric-soft)] palette-active-item" : "hover:bg-[var(--bg-hover)]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-7 w-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs shrink-0 select-none">
                                  {isIncome ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-[var(--mint)]" />
                                  ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-[var(--flame)]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                    {tx.note || tx.category}
                                  </p>
                                  <p className="text-[9px] text-[var(--text-secondary)] truncate font-mono mt-0.5">
                                    {tx.category} • {new Date(tx.date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className={clsx("font-mono text-xs font-bold", isIncome ? "text-[var(--mint)]" : "text-[var(--text-primary)]")}>
                                {isIncome ? "+" : "-"}₹{tx.amount}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Shortcuts Help */}
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1.5 items-center text-[10px] text-[var(--text-secondary)] font-medium">
            <span className="font-bold flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-[var(--text-dim)]" /> Shortcuts:</span>
            {SHORTCUTS.slice(0, 4).map((s) => {
              const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
              const displayKey = s.keys.length > 1 ? (isMac ? s.keys[0] : s.keys[1]) : s.keys[0];
              return (
                <span key={s.desc} className="flex items-center gap-1.5 select-none">
                  <span className="font-mono text-[9px] border border-[var(--border-default)] rounded px-1 text-[var(--text-dim)] bg-[var(--bg-surface)] font-bold">
                    {displayKey}
                  </span>
                  <span>{s.desc}</span>
                </span>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
