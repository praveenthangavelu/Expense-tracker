import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, Sparkles, Scale, Settings, CheckCircle, AlertTriangle, Play, Pause, ChevronLeft, ChevronRight, Info, Eye, Check } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import monthlyPlanService from "../services/monthlyPlanService";
import { MONTH_NAMES } from "../utils/constants";
import { getDaysInMonth } from "date-fns";

export const MonthlyPlanner = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [plan, setPlan] = useState(null);
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  const loadData = async (targetMonth, targetYear) => {
    setLoading(true);
    try {
      const res = await monthlyPlanService.getPlan({ month: targetMonth, year: targetYear, autoCreate: true });
      if (res.success) {
        setPlan(res.data.plan);
        setAutomations(res.data.automations || []);
      }
    } catch (err) {
      toast.error("Failed to load monthly plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(month, year);
  }, [month, year]);

  const handleAutoGenerate = async () => {
    if (!window.confirm("Auto-generating will replace your current planned budget. Proceed?")) return;
    setActionLoading(true);
    try {
      const res = await monthlyPlanService.createPlan({ month, year, autoGenerate: true });
      if (res.success) {
        toast.success("Budget generated based on past 3 months!");
        loadData(month, year);
      }
    } catch (err) {
      toast.error("Failed to auto-generate monthly planner");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebalanceLoad = async () => {
    setRebalanceOpen(true);
    setActionLoading(true);
    try {
      const res = await monthlyPlanService.getRebalance({ month, year });
      if (res.success) {
        setRebalanceSuggestions(res.data);
      }
    } catch (err) {
      toast.error("Failed to calculate rebalance options");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyRebalance = async () => {
    if (!rebalanceSuggestions || rebalanceSuggestions.reallocations.length === 0) return;

    setActionLoading(true);
    try {
      const res = await monthlyPlanService.applyRebalance({ reallocations: rebalanceSuggestions.reallocations }, { month, year });
      if (res.success) {
        toast.success("Budget rebalanced successfully!");
        setRebalanceOpen(false);
        loadData(month, year);
      }
    } catch (err) {
      toast.error("Failed to apply rebalance");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoadReport = async () => {
    setReportOpen(true);
    setActionLoading(true);
    try {
      const res = await monthlyPlanService.getMonthEndReport({ month, year });
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error("Failed to generate month-end report");
    } finally {
      setActionLoading(false);
    }
  };

  // Rule toggle helper
  const handleToggleRule = async (ruleIdx) => {
    if (!plan) return;
    const rule = plan.rules[ruleIdx];
    const updatedRules = [...plan.rules];
    updatedRules[ruleIdx] = { ...rule, isActive: !rule.isActive };

    try {
      // In a real app we'd call an endpoint to toggle, or just save back to rules
      await monthlyPlanService.addRule({ type: rule.type, config: rule.config, isActive: !rule.isActive }, { month, year });
      toast.success(`Rule '${rule.type}' updated`);
      loadData(month, year);
    } catch (err) {
      toast.error("Failed to update rule settings");
    }
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Heatmap helper calculations
  const calendarCells = useMemo(() => {
    if (!plan || !plan.dailyLog) return [];
    
    const date = new Date(year, month - 1, 1);
    const startDayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon...
    const daysInMonth = getDaysInMonth(date);

    const cells = [];
    // Pad start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ pad: true });
    }

    // Populate actual logs
    plan.dailyLog.forEach((log) => {
      const spent = log.spent || 0;
      const budget = log.budgetForDay || plan.dailyBudget;
      
      let colorClass = "bg-[var(--bg-base)] border-[var(--border-subtle)]"; // no spend
      let statusText = "No Spending";

      if (spent > 0) {
        const pct = (spent / budget) * 100;
        if (pct > 150) {
          colorClass = "bg-red-950 text-red-200 border-red-900";
          statusText = "Way Over Limit (>150%)";
        } else if (pct > 100) {
          colorClass = "bg-[var(--flame-soft)] text-[var(--flame)] border-red-900/40";
          statusText = "Over Limit";
        } else if (pct > 80) {
          colorClass = "bg-[var(--solar-soft)] text-[var(--solar)] border-amber-900/40";
          statusText = "Near Limit (80-100%)";
        } else {
          colorClass = "bg-[var(--mint-soft)] text-[var(--mint)] border-emerald-900/40";
          statusText = "Under Daily Limit";
        }
      }

      cells.push({
        pad: false,
        dayNum: new Date(log.date).getDate(),
        spent,
        budget,
        colorClass,
        statusText,
      });
    });

    return cells;
  }, [plan, month, year]);

  if (loading) {
    return <Loader label="Loading monthly planner..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-12 animate-in"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2 select-none">
            <CalendarRange className="h-6 w-6 text-[var(--mint)]" />
            Monthly Planner
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">Real-time daily budget track and optimization tools.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto select-none bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] p-1">
          <button onClick={handlePrevMonth} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-white hover:bg-[var(--bg-hover)] transition cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-headline font-bold text-xs text-white px-2">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={handleNextMonth} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-white hover:bg-[var(--bg-hover)] transition cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={handleAutoGenerate} loading={actionLoading} className="flex items-center gap-1.5 text-xs text-[var(--electric)] bg-[var(--electric-soft)] hover:bg-white/5 cursor-pointer">
          <Sparkles className="h-3.5 w-3.5" />
          Auto-Generate Plan
        </Button>
        <Button variant="ghost" onClick={handleRebalanceLoad} loading={actionLoading} className="flex items-center gap-1.5 text-xs text-[var(--mint)] bg-[var(--mint-soft)] hover:bg-white/5 cursor-pointer">
          <Scale className="h-3.5 w-3.5" />
          Rebalance Budget
        </Button>
        <Button variant="ghost" onClick={handleLoadReport} className="flex items-center gap-1.5 text-xs text-[var(--solar)] bg-[var(--solar-soft)] hover:bg-white/5 cursor-pointer">
          <Eye className="h-3.5 w-3.5" />
          Month-End Report
        </Button>
      </div>

      {/* Summary Cards */}
      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-[var(--electric)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Monthly Budget</p>
            <p className="text-xl font-bold text-white font-mono mt-1">₹{plan.totalBudget?.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">Spent YTD: ₹{plan.totalSpent?.toLocaleString()}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--mint)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Daily Spending Cap</p>
            <p className="text-xl font-bold text-[var(--mint)] font-mono mt-1">₹{plan.dailyBudget?.toLocaleString()}/day</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">Calculated target</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--solar)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Savings Target</p>
            <p className="text-xl font-bold text-white font-mono mt-1">₹{plan.savingsTarget?.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">Based on income</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--flame)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Budget Remaining</p>
            <p className="text-xl font-bold text-white font-mono mt-1">₹{Math.max(0, plan.totalBudget - plan.totalSpent).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">Buffer left</p>
          </Card>
        </div>
      )}

      {/* Main Split: Heatmap calendar & Budget track list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Heatmap calendar (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card header="Daily Spending Heatmap 🗓️" className="p-5">
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 select-none">
              {calendarCells.map((c, i) => {
                if (c.pad) return <div key={i} className="aspect-square bg-transparent rounded-lg border border-transparent" />;

                return (
                  <div
                    key={i}
                    title={`Day ${c.dayNum}: Spent ₹${c.spent} of ₹${c.budget} (${c.statusText})`}
                    className={`aspect-square rounded-lg border flex flex-col justify-between p-1 text-xs transition duration-200 hover:scale-105 ${c.colorClass}`}
                  >
                    <span className="font-bold text-[8px] font-mono select-none">{c.dayNum}</span>
                    {c.spent > 0 && (
                      <span className="font-bold font-mono text-[7px] text-right truncate">₹{c.spent}</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Heatmap Legend */}
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-3 items-center justify-center text-[9px] font-semibold text-[var(--text-secondary)] uppercase">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]" /> No spend</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--mint-soft)] border border-emerald-900/40" /> Under budget</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--solar-soft)] border border-amber-900/40" /> Warning (80%)</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--flame-soft)] border border-red-900/40" /> Over limit</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-950 border border-red-900" /> Over &gt;150%</span>
            </div>
          </Card>

          {/* Rules & Automations section */}
          {plan && (
            <Card header="Active Rules & Budget Limits" className="p-6">
              <div className="space-y-3">
                {plan.rules.map((rule, idx) => {
                  let desc = "";
                  if (rule.type === "daily_limit") desc = `Cap spending at ₹${rule.config?.limit}/day. Warnings fire on overage.`;
                  if (rule.type === "weekly_limit") desc = `Cap spending at ₹${rule.config?.limit}/week. Warnings fire on overage.`;
                  if (rule.type === "category_cap") desc = `Limit ${rule.config?.category} to ₹${rule.config?.limit} per week.`;
                  if (rule.type === "no_spend_day") desc = `Designate ${rule.config?.day}s as zero spending. Alerts trigger if violated.`;

                  return (
                    <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white capitalize">{rule.type.replace("_", " ")}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                      </div>

                      <button onClick={() => handleToggleRule(idx)} className="cursor-pointer">
                        {rule.isActive ? (
                          <span className="rounded-full bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.2)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5" />
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--bg-hover)] text-[var(--text-dim)] border border-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Paused
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right column: Category budgets tracker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {plan && (
            <Card header="Budget Tracker" className="p-6">
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-none">
                {plan.plannedExpenses.map((exp, idx) => {
                  let progressColor = "bg-[var(--mint)]";
                  if (exp.percentage > 100) progressColor = "bg-[var(--flame)]";
                  else if (exp.percentage >= 90) progressColor = "bg-[var(--flame)]";
                  else if (exp.percentage >= 70) progressColor = "bg-[var(--solar)]";

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-semibold text-white">
                        <span>{exp.category}</span>
                        <span className="font-mono">₹{exp.spentAmount.toLocaleString()} / ₹{exp.budgetAmount.toLocaleString()}</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="relative h-[8px] w-full rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${Math.min(100, exp.percentage)}%` }} />
                        {exp.percentage > 100 && (
                          <div className="absolute inset-0 bg-stripe-pattern animate-pulse" />
                        )}
                      </div>

                      <div className="flex justify-between text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        <span>{exp.percentage}% utilized</span>
                        {exp.percentage > 100 ? (
                          <span className="text-[var(--flame)] font-mono">₹{Math.abs(exp.budgetAmount - exp.spentAmount)} over!</span>
                        ) : (
                          <span className="text-[var(--text-dim)] font-mono">₹{exp.remaining} left</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Weekly review logs */}
          {plan && plan.weeklyReview && plan.weeklyReview.length > 0 && (
            <Card header="Weekly Review Grades" className="p-5">
              <div className="space-y-3">
                {plan.weeklyReview.map((rev, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    <span className="text-xl p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-display font-bold text-[var(--electric)] select-none">
                      W{rev.weekNumber}
                    </span>
                    <div className="flex-grow space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-white">Spent ₹{rev.totalSpent} of ₹{rev.budgetForWeek}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{rev.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL: BUDGET REBALANCE RECOMMENDATIONS
          ========================================== */}
      <Modal isOpen={rebalanceOpen} onClose={() => setRebalanceOpen(false)} title="Smart Budget Rebalancing Tool">
        {actionLoading && !rebalanceSuggestions ? (
          <div className="flex h-32 items-center justify-center text-[var(--text-secondary)]">Analyzing budgets...</div>
        ) : rebalanceSuggestions ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[rgba(99,228,181,0.2)] bg-[var(--mint-soft)] text-xs leading-relaxed text-[var(--text-primary)]">
              <p className="font-bold flex items-center gap-1.5 text-[var(--mint)]">
                <Info className="h-4 w-4" />
                Monthly Buffer Re-allocation
              </p>
              <p className="mt-1">
                Based on current spending trends, we calculated remaining funds. Your new daily spending limit for the remaining {rebalanceSuggestions.remainingDays} days will be adjusted to ₹{rebalanceSuggestions.adjustedDailyBudget}/day.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase select-none">Suggested Category Shifts</p>
              {rebalanceSuggestions.reallocations.length === 0 ? (
                <p className="text-xs text-[var(--text-dim)] text-center py-4">No category reallocations required this month. All budgets are safe!</p>
              ) : (
                rebalanceSuggestions.reallocations.map((re, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-start gap-3">
                    <span className="text-lg py-1 select-none">🔄</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Move ₹{re.amount} from {re.from} to {re.to}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{re.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button variant="ghost" type="button" onClick={() => setRebalanceOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleApplyRebalance}
                loading={actionLoading}
                disabled={rebalanceSuggestions.reallocations.length === 0}
              >
                Apply Rebalance Shifts
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ==========================================
          MODAL: MONTH END REPORT
          ========================================== */}
      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Month-End Budget Report">
        {actionLoading && !reportData ? (
          <div className="flex h-32 items-center justify-center text-[var(--text-secondary)]">Generating final report...</div>
        ) : reportData ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center py-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)]">
              <div className="text-center">
                <span className="text-6xl font-headline font-bold text-[var(--electric)] select-none">{reportData.grade}</span>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mt-1">Overall Grade</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
                <p className="text-[var(--text-secondary)] uppercase text-[9px] tracking-wider mb-1">Planned Budget</p>
                <p className="text-white font-bold text-sm">₹{reportData.totalBudget}</p>
              </div>
              <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
                <p className="text-[var(--text-secondary)] uppercase text-[9px] tracking-wider mb-1">Actual Spent</p>
                <p className="text-white font-bold text-sm">₹{reportData.totalSpent}</p>
              </div>
              <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl">
                <p className="text-[var(--text-secondary)] uppercase text-[9px] tracking-wider mb-1">Actual Savings</p>
                <p className="text-[var(--mint)] font-bold text-sm">₹{reportData.actualSavings}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase select-none">Key Takeaways</span>
              <ul className="space-y-1.5 text-xs font-semibold text-[var(--text-primary)]">
                {reportData.takeaways.map((t, idx) => (
                  <li key={idx} className="flex gap-2 items-start p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    <span className="text-[var(--mint)] shrink-0 select-none">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button variant="ghost" type="button" onClick={() => setReportOpen(false)}>Close Report</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </motion.div>
  );
};
export default MonthlyPlanner;
