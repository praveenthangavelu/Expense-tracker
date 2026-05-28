import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

import Modal from "../components/common/Modal";
import Card from "../components/common/Card";

import CategoryPieChart from "../components/dashboard/CategoryPieChart";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import FoodBreakdown from "../components/dashboard/FoodBreakdown";
import InsightCards from "../components/dashboard/InsightCards";
import BudgetAlert from "../components/common/BudgetAlert";
import { useTransactions } from "../context/TransactionContext";
import HealthScore from "../components/dashboard/HealthScore";
import AdvisorWidget from "../components/dashboard/AdvisorWidget";
import usePopups from "../hooks/usePopups";
import SavingsGoalStrip from "../components/dashboard/SavingsGoalStrip";
import gamificationService from "../services/gamificationService";
import goalService from "../services/goalService";
import monthlyPlanService from "../services/monthlyPlanService";
import useDashboardLayout from "../hooks/useDashboardLayout";

const Dashboard = () => {
  const navigate = useNavigate();
  const { summary } = useTransactions();
  const { triggerActionPopup } = usePopups();
  const shouldReduceMotion = useReducedMotion();

  // Collapsible section preferences via localStorage hook
  const { sections, toggleSection } = useDashboardLayout();

  // Fetch gamification & goal stats
  const [streaks, setStreaks] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [monthlyPlan, setMonthlyPlan] = useState(null);

  // Expand chart modals
  const [expandedChart, setExpandedChart] = useState(null); // 'monthly' | 'category' | null

  const balance = summary?.balance || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  };

  useEffect(() => {
    triggerActionPopup("daily_login");

    // Fetch details
    gamificationService.getStreaks().then((res) => {
      if (res?.success) setStreaks(res.data);
    }).catch(() => {});

    gamificationService.getProfile().then((res) => {
      if (res?.success) setProfile(res.data);
    }).catch(() => {});

    goalService.getAll().then((res) => {
      if (res?.data) {
        const active = res.data.filter((g) => g.status === "active" || !g.isCompleted).length;
        setActiveGoalsCount(active);
      }
    }).catch(() => {});

    const now = new Date();
    monthlyPlanService.getPlan({ month: now.getMonth() + 1, year: now.getFullYear() }).then((res) => {
      if (res?.success) setMonthlyPlan(res.data.plan);
    }).catch(() => {});
  }, [triggerActionPopup]);

  // Calculations for budget bar
  const budgetLimit = monthlyPlan?.totalBudget || 40000;
  const spentPct = Math.min(100, Math.round((balance.totalExpense / budgetLimit) * 100));
  
  // Progress bar colors
  let progressColor = "bg-[var(--mint)] shadow-[0_0_10px_rgba(99,228,181,0.3)]";
  if (spentPct > 80) {
    progressColor = "bg-[var(--flame)] shadow-[0_0_10px_rgba(255,107,107,0.3)]";
  } else if (spentPct >= 50) {
    progressColor = "bg-[var(--solar)] shadow-[0_0_10px_rgba(255,179,71,0.3)]";
  }

  // Active streaks count
  const loggingStreak = streaks?.logging?.current || 0;

  // Format today's date
  const todayStr = format(new Date(), "MMMM d, yyyy · EEEE");

  const handleQuickAction = (action) => {
    if (action === "expense") {
      window.dispatchEvent(new CustomEvent("open-transaction-form", { detail: { type: "expense" } }));
    } else if (action === "scan") {
      window.dispatchEvent(new CustomEvent("open-transaction-form", { detail: { openScanner: true } }));
    } else if (action === "import") {
      navigate("/settings?tab=import");
    }
  };

  return (
    <div className="space-y-6">
      <BudgetAlert />

      {/* ROW 1 — GREETING + QUICK STATS */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:p-6 shadow-md flex flex-col gap-4 relative overflow-hidden select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="font-headline text-lg md:text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Good morning, {profile?.name?.split(" ")[0] || "User"} 👋
            </h2>
            <p className="text-[10px] md:text-xs font-semibold text-[var(--text-secondary)]">{todayStr}</p>
          </div>
          <div className="font-mono text-xs font-bold text-[var(--mint)] flex items-center gap-1.5 self-start sm:self-auto mt-1 sm:mt-0">
            <span className="h-2 w-2 rounded-full bg-[var(--mint)] animate-ping" />
            Live Sync Active
          </div>
        </div>

        {/* Compact stats strip */}
        <div className="grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4 text-center sm:text-left">
          <div>
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider block">Income</span>
            <span className="font-mono text-sm md:text-base font-bold text-[var(--mint)]">
              ₹{balance.totalIncome.toLocaleString()}
            </span>
          </div>
          <div className="border-x border-[var(--border-subtle)] px-3">
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider block">Spent</span>
            <span className="font-mono text-sm md:text-base font-bold text-[var(--flame)]">
              ₹{balance.totalExpense.toLocaleString()}
            </span>
          </div>
          <div className="pl-3">
            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider block">Balance</span>
            <span className="font-mono text-sm md:text-base font-bold text-[var(--text-primary)]">
              ₹{balance.balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Dynamic progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full rounded-full bg-[var(--progress-track)] overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${progressColor}`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            <span>{spentPct}% of monthly budget used</span>
            <span className="font-mono text-[var(--text-primary)]">Limit: ₹{budgetLimit.toLocaleString()}</span>
          </div>
        </div>

        {/* Badges/Streaks line */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] font-bold text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
          <span className="flex items-center gap-1">
            <span className="text-sm select-none">🔥</span>
            <span>{loggingStreak}-day streak</span>
          </span>
          <span className="flex items-center gap-1 border-x border-[var(--border-subtle)] px-4">
            <span className="text-sm select-none">🎯</span>
            <span>{activeGoalsCount} goals active</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-sm select-none">🏆</span>
            <span className="text-[var(--mint)]">Lvl {profile?.level || 3} · {profile?.levelTitle || "Saver"}</span>
          </span>
        </div>
      </div>

      {/* ROW 2 — QUICK ACTIONS */}
      <div className="grid grid-cols-3 gap-3 select-none">
        <button
          type="button"
          onClick={() => handleQuickAction("expense")}
          className="group flex flex-col md:flex-row items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-3 text-center md:text-left transition-all hover:border-[var(--electric)] hover:shadow-[var(--shadow-glow-electric)] outline-none"
        >
          <div className="h-9 w-9 rounded-lg bg-[var(--electric-soft)] border border-[rgba(124,111,255,0.2)] flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0 select-none">
            💸
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Add Expense</h4>
            <p className="text-[9px] text-[var(--text-dim)] font-semibold mt-0.5 hidden md:block">Manual entry (N)</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleQuickAction("scan")}
          className="group flex flex-col md:flex-row items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-3 text-center md:text-left transition-all hover:border-[var(--mint)] hover:shadow-[var(--shadow-glow-mint)] outline-none"
        >
          <div className="h-9 w-9 rounded-lg bg-[var(--mint-soft)] border border-[rgba(99,228,181,0.2)] flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0 select-none">
            📷
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Scan Bill</h4>
            <p className="text-[9px] text-[var(--text-dim)] font-semibold mt-0.5 hidden md:block">Auto-parse OCR (S)</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleQuickAction("import")}
          className="group flex flex-col md:flex-row items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] p-3 text-center md:text-left transition-all hover:border-[var(--solar)] hover:shadow-[0_0_40px_rgba(255,179,71,0.15)] outline-none"
        >
          <div className="h-9 w-9 rounded-lg bg-[var(--solar-soft)] border border-[rgba(255,179,71,0.2)] flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0 select-none">
            📥
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Import</h4>
            <p className="text-[9px] text-[var(--text-dim)] font-semibold mt-0.5 hidden md:block">SMS & CSV configs (I)</p>
          </div>
        </button>
      </div>

      {/* ROW 3 — SMART SUMMARY CHARTS (2 Columns) */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Chart 1: Monthly Overview */}
        <Card className="h-auto lg:h-[400px] flex flex-col">
          <MonthlyChart onExpand={() => setExpandedChart("monthly")} />
        </Card>

        {/* Chart 2: Category Breakdown */}
        <Card className="h-auto lg:h-[400px] flex flex-col">
          <CategoryPieChart onExpand={() => setExpandedChart("category")} />
        </Card>
      </div>

      {/* ROW 4 — RECENT + INSIGHTS */}
      <div className="grid gap-5 xl:grid-cols-2">
        <RecentTransactions />
        
        <Card
          header={
            <div className="flex justify-between items-center w-full select-none">
              <div>
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">Smart Insights</h3>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">Spending alerts & behavior tips</p>
              </div>
              <Link
                to="/insights?tab=overview"
                className="text-[10px] font-bold text-[var(--mint)] hover:underline outline-none"
              >
                See full analysis →
              </Link>
            </div>
          }
        >
          <InsightCards />
        </Card>
      </div>

      {/* ROW 5 — COLLAPSIBLE EXTRAS */}
      <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] select-none">
        
        {/* Accordion 1: Food Breakdown */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("foodBreakdown")}
            aria-expanded={sections.foodBreakdown}
            className="w-full flex items-center justify-between p-4 font-bold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] outline-none"
          >
            <span className="flex items-center gap-2">🍔 Food Breakdown Analysis</span>
            {sections.foodBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <AnimatePresence initial={false}>
            {sections.foodBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.25, ease: "easeInOut" }}
                className="border-t border-[var(--border-subtle)] p-4"
              >
                <FoodBreakdown />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 2: Health Score & Spending Advisor */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("healthScore")}
            aria-expanded={sections.healthScore}
            className="w-full flex items-center justify-between p-4 font-bold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] outline-none"
          >
            <span className="flex items-center gap-2">❤️ Health Score & Advisor Recommendations</span>
            {sections.healthScore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <AnimatePresence initial={false}>
            {sections.healthScore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.25, ease: "easeInOut" }}
                className="border-t border-[var(--border-subtle)] p-4"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <HealthScore />
                  <AdvisorWidget />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 3: Savings Goals */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("goals")}
            aria-expanded={sections.goals}
            className="w-full flex items-center justify-between p-4 font-bold text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] outline-none"
          >
            <span className="flex items-center gap-2">🎯 Active Savings Milestones</span>
            {sections.goals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          <AnimatePresence initial={false}>
            {sections.goals && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.25, ease: "easeInOut" }}
                className="border-t border-[var(--border-subtle)] p-4"
              >
                <SavingsGoalStrip />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================
          FULL SCREEN CHART ZOOM MODALS
          ======================================================== */}
      {/* 1. Monthly chart modal */}
      <Modal
        isOpen={expandedChart === "monthly"}
        onClose={() => setExpandedChart(null)}
        title="Monthly Income vs Expenses Overview"
      >
        <div className="h-[60vh] min-h-[350px] flex flex-col">
          <MonthlyChart />
        </div>
      </Modal>

      {/* 2. Category chart modal */}
      <Modal
        isOpen={expandedChart === "category"}
        onClose={() => setExpandedChart(null)}
        title="Category Spend Distributions Breakdown"
      >
        <div className="h-[60vh] min-h-[350px] flex flex-col">
          <CategoryPieChart />
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
