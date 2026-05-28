import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { advisorService } from "../services/advisorService";
import { insightService } from "../services/insightService";
import { transactionService } from "../services/transactionService";
import { MONTH_NAMES } from "../utils/constants";
import { exportCSV } from "../utils/exportCSV";

// Import modular components
import FinancialHealthHero from "../components/insights/FinancialHealthHero";
import OverspendingAlerts from "../components/insights/OverspendingAlerts";
import SavingsOpportunities from "../components/insights/SavingsOpportunities";
import SpendingVelocity from "../components/insights/SpendingVelocity";
import SpendingPatterns from "../components/insights/SpendingPatterns";
import StatsGrid from "../components/insights/StatsGrid";
import DailyTrendChart from "../components/insights/DailyTrendChart";
import CategoryTable from "../components/insights/CategoryTable";
import TopExpenses from "../components/insights/TopExpenses";
import SmartInsights from "../components/insights/SmartInsights";

const safeFormatDate = (dateStr, formatStr = "dd MMM") => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  try {
    return format(d, formatStr);
  } catch {
    return "N/A";
  }
};

const Insights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  const activeTab = useMemo(() => {
    return new URLSearchParams(search).get("tab");
  }, [search]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [analysis, setAnalysis] = useState(null);
  const [insights, setInsights] = useState([]);
  const [familyInsights, setFamilyInsights] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lastMonthTransactions, setLastMonthTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [visibleSection, setVisibleSection] = useState("advisor");

  const isAdmin = user?.familyRole === "admin";

  const fetchAllData = async (month, year) => {
    setLoading(true);
    setError(null);
    try {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      const promises = [
        advisorService.getFullAnalysis({ month, year }),
        insightService.getInsights({ month, year }),
        isAdmin
          ? insightService.getFamilyInsights({ month, year })
          : Promise.resolve({ data: [] }),
        transactionService.getAllForMonth(month, year),
        transactionService.getAllForMonth(prevMonth, prevYear),
      ];

      const [advisorRes, insightsRes, familyRes, currentTxRes, prevTxRes] =
        await Promise.all(promises);

      if (advisorRes?.success) {
        setAnalysis(advisorRes.data);
      }
      setInsights(insightsRes?.data || []);
      setFamilyInsights(familyRes?.data || []);
      setTransactions(currentTxRes?.data || []);
      setLastMonthTransactions(prevTxRes?.data || []);

      setLastUpdated(format(new Date(), "hh:mm a"));
    } catch (err) {
      console.error("Failed to load insights ecosystem data:", err);
      setError(
        err.message || "An unexpected error occurred while fetching analysis and transaction trends."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData(selectedMonth, selectedYear);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, isAdmin]);

  // Scrollspy logic to update active quick navigation pill
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["advisor", "reports", "health", "overview"];
      const scrollPos = window.scrollY + 220; // detection point offset below topbar

      for (const sec of sections) {
        const el = document.getElementById(sec);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setVisibleSection(sec);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle programmatic scroll jumps from tab parameters
  useEffect(() => {
    if (!loading && activeTab) {
      const timer = setTimeout(() => {
        const element = document.getElementById(activeTab);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, loading]);

  // Transaction derived stats
  const stats = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      savings: income - expenses,
      count: transactions.length,
    };
  }, [transactions]);

  const lastMonthStats = useMemo(() => {
    const income = lastMonthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = lastMonthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      savings: income - expenses,
      count: lastMonthTransactions.length,
    };
  }, [lastMonthTransactions]);

  const changeBadges = useMemo(() => {
    const getBadge = (curr, prev) => {
      if (prev === 0) return { text: "No history", isIncrease: null };
      const diff = curr - prev;
      const pct = Math.round((diff / prev) * 100);
      const isIncrease = diff > 0;
      return {
        text: `${isIncrease ? "↑" : "↓"} ${Math.abs(pct)}%`,
        isIncrease,
      };
    };

    return {
      income: getBadge(stats.income, lastMonthStats.income),
      expenses: getBadge(stats.expenses, lastMonthStats.expenses),
      savings: getBadge(stats.savings, lastMonthStats.savings),
      count: getBadge(stats.count, lastMonthStats.count),
    };
  }, [stats, lastMonthStats]);

  const trend = useMemo(() => {
    const rows = {};
    transactions.forEach((item) => {
      const day = safeFormatDate(item.date, "d MMM");
      rows[day] ||= { day, Income: 0, Expense: 0 };
      rows[day][item.type === "income" ? "Income" : "Expense"] += item.amount;
    });
    return Object.values(rows);
  }, [transactions]);

  const categories = useMemo(() => {
    const rows = {};
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        rows[item.category] ||= { name: item.category, amount: 0, count: 0 };
        rows[item.category].amount += item.amount;
        rows[item.category].count += 1;
      });
    return Object.values(rows).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const biggest = useMemo(() => {
    return [...transactions]
      .filter((item) => item.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  if (loading && !analysis) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
        <Loader label="Synthesizing financial reports & AI insights..." />
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
        <div className="glass rounded-3xl p-8 border border-[var(--border-default)] max-w-md text-center space-y-4">
          <span className="text-4xl select-none">⚠️</span>
          <h3 className="font-headline text-lg font-bold text-white">Failed to load Insights</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed select-text">
            {error}
          </p>
          <button
            onClick={() => fetchAllData(selectedMonth, selectedYear)}
            className="rounded-xl bg-[var(--electric)] text-white hover:bg-[#685ad6] px-5 py-2.5 text-xs font-bold transition-all"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  const {
    overspending = [],
    savingsOpportunities = [],
    spendingVelocity = null,
    patterns = [],
    summary = null,
  } = analysis || {};

  return (
    <div className="space-y-8 pb-16 relative">
      {/* STICKY CONTROL HEADER SECTION (Sticks perfectly under Topbar without clipping) */}
      <div className="sticky top-14 md:top-18 z-10 bg-[var(--bg-base)]/90 backdrop-blur-md border-b border-white/[0.06] py-3 -mx-6 px-6 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all duration-300">
        <div className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 rounded-xl bg-[var(--electric-soft)]/20 border border-[var(--electric-glow)]/30 flex items-center justify-center text-[var(--electric)] shrink-0">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white tracking-tight leading-tight">
              Insights Workspace
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">
              Comprehensive financial health, AI patterns, and reports.
            </p>
          </div>
        </div>

        {/* Anchor Quick-jump pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none snap-x select-none">
          {[
            { id: "advisor", label: "Health Score" },
            { id: "reports", label: "Stats & Reports" },
            { id: "health", label: "Opportunities" },
            { id: "overview", label: "Smart AI Insights" },
          ].map((pill) => {
            const isPillActive = visibleSection === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => {
                  const element = document.getElementById(pill.id);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className={clsx(
                  "relative rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shrink-0 snap-start cursor-pointer border",
                  isPillActive
                    ? "bg-[var(--electric-soft)] text-white border-[rgba(124,111,255,0.4)] shadow-[0_0_15px_rgba(124,111,255,0.15)]"
                    : "bg-white/[0.02] text-[var(--text-secondary)] border-white/[0.04] hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 self-end sm:self-center">
          {lastUpdated && (
            <span className="text-[9px] text-[var(--text-dim)] font-mono font-bold uppercase tracking-wider hidden lg:inline">
              Sync: {lastUpdated}
            </span>
          )}
          <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border-0 bg-transparent text-[10.5px] text-white py-1 px-2 focus:ring-0 focus:outline-none cursor-pointer font-bold uppercase tracking-wider"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1} className="bg-[var(--bg-surface)]">
                  {MONTH_NAMES[i]}
                </option>
              ))}
            </select>
            <div className="w-[1px] bg-white/[0.05]" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border-0 bg-transparent text-[10.5px] text-white py-1 px-2 focus:ring-0 focus:outline-none cursor-pointer font-bold uppercase tracking-wider"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-[var(--bg-surface)]">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchAllData(selectedMonth, selectedYear)}
            disabled={loading}
            className="rounded-xl border border-white/[0.06] hover:bg-white/[0.04] p-2.5 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={clsx("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* SECTION 1: FINANCIAL HEALTH SUMMARY HERO */}
      {summary && (
        <motion.div
          id="advisor"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <FinancialHealthHero summary={summary} />
        </motion.div>
      )}

      {/* SECTION 2: MONTHLY SUMMARY STATS GRID */}
      <motion.div
        id="reports"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <StatsGrid stats={stats} changeBadges={changeBadges} />
      </motion.div>

      {/* SECTION 3: SPENDING VELOCITY RACETRACK */}
      {spendingVelocity && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SpendingVelocity
            spendingVelocity={spendingVelocity}
            month={selectedMonth}
            year={selectedYear}
          />
        </motion.div>
      )}

      {/* SECTION 4: 2-COLUMN ALERTS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="health">
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <OverspendingAlerts overspending={overspending} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <SavingsOpportunities savingsOpportunities={savingsOpportunities} />
        </motion.div>
      </div>

      {/* SECTION 5: DAILY TREND AREA CHART */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <DailyTrendChart trend={trend} />
      </motion.div>

      {/* SECTION 6: 2-COLUMN CATEGORIES & TOP EXPENSES */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CategoryTable categories={categories} totalExpenses={stats.expenses} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <TopExpenses biggest={biggest} />
        </motion.div>
      </div>

      {/* SECTION 7: SMART INSIGHTS CARDS */}
      <motion.div
        id="overview"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SmartInsights
          insights={insights}
          familyInsights={familyInsights}
          isAdmin={isAdmin}
        />
      </motion.div>

      {/* SECTION 8: SPENDING BEHAVIOR PATTERNS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <SpendingPatterns patterns={patterns} />
      </motion.div>

      {/* FOOTER CTA SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass rounded-[24px] p-6 border border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 cursor-pointer hover:border-white/[0.08] transition-all duration-300"
      >
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white">Looking for complete detailed spreadsheets?</h4>
          <p className="text-xs text-[var(--text-secondary)]">
            Export all monthly transactions to a CSV spreadsheet or view full comparison details.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="ghost" onClick={() => exportCSV(transactions)} className="h-10 text-xs">
            Export CSV
          </Button>
          <Button variant="electric" onClick={() => navigate("/reports")} className="h-10 text-xs">
            View Full Report →
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Insights;
export { Insights as InsightsPage };
