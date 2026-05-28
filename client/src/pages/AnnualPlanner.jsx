import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Edit2, ArrowRightLeft, Target, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Compass } from "lucide-react";
import toast from "react-hot-toast";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import annualPlanService from "../services/annualPlanService";
import goalService from "../services/goalService";
import { MONTH_NAMES } from "../utils/constants";
import { useChartTheme } from "../hooks/useChartTheme";

export const AnnualPlanner = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [plan, setPlan] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recs, setRecs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const chartTheme = useChartTheme();

  // Modals
  const [editMonth, setEditMonth] = useState(null); // month object (1-12)
  const [monthForm, setMonthForm] = useState({ plannedIncome: "", expenses: [] });
  const [linkGoalOpen, setLinkGoalOpen] = useState(false);
  const [goalToLink, setGoalToLink] = useState("");

  const loadData = async (targetYear) => {
    setLoading(true);
    try {
      const [planRes, recsRes, goalsRes] = await Promise.all([
        annualPlanService.getPlan({ year: targetYear, autoCreate: true }),
        annualPlanService.getRecommendations(targetYear),
        goalService.getAll(),
      ]);

      if (planRes.success) {
        setPlan(planRes.data.plan);
        setAnalysis(planRes.data.analysis);
      }
      setRecs(recsRes.data || []);
      setGoals(goalsRes.data?.filter(g => g.status === "active") || []);
    } catch (err) {
      toast.error("Failed to load annual plan data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(year);
  }, [year]);

  const handleAutoFill = async () => {
    if (!window.confirm("Auto-fill will overwrite current planned numbers for this year using historical averages. Continue?")) return;
    setActionLoading(true);
    try {
      const res = await annualPlanService.createPlan({ year, autoFill: true });
      if (res.success) {
        toast.success("Annual plan generated from history!");
        loadData(year);
      }
    } catch (err) {
      toast.error("Failed to auto-fill plan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncActuals = async () => {
    setActionLoading(true);
    try {
      const res = await annualPlanService.syncActuals(year);
      if (res.success) {
        toast.success("Synchronized actuals from database!");
        loadData(year);
      }
    } catch (err) {
      toast.error("Failed to sync actuals");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMonthOpen = (m) => {
    setEditMonth(m);
    setMonthForm({
      plannedIncome: String(m.planned.income),
      expenses: m.planned.expenses.map((e) => ({ category: e.category, amount: String(e.amount), note: e.note })),
    });
  };

  const handleSaveMonth = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        plannedIncome: Number(monthForm.plannedIncome),
        expenses: monthForm.expenses.map((e) => ({
          category: e.category,
          amount: Number(e.amount),
          note: e.note,
        })),
      };

      const res = await annualPlanService.updateMonth(editMonth.month, payload, year);
      if (res.success) {
        toast.success(`${MONTH_NAMES[editMonth.month - 1]} planned limits updated`);
        setEditMonth(null);
        loadData(year);
      }
    } catch (err) {
      toast.error("Failed to update month limits");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalToLink) return;

    setActionLoading(true);
    try {
      await annualPlanService.linkGoal({ goalId: goalToLink, year });
      toast.success("Savings goal linked into annual projections!");
      setLinkGoalOpen(false);
      setGoalToLink("");
      loadData(year);
    } catch (err) {
      toast.error("Failed to link savings goal");
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!plan || !plan.months) return [];
    let cumulativeSavings = 0;
    let cumulativeTarget = 0;

    return plan.months.map((m) => {
      const monthIndex = m.month - 1;
      const name = (MONTH_NAMES[monthIndex] || "Jan").slice(0, 3);
      cumulativeSavings += m.actual?.savings || 0;
      cumulativeTarget += m.planned?.savings || 0;

      return {
        name,
        "Planned Exp": m.planned?.totalExpense || 0,
        "Actual Exp": m.status !== "upcoming" ? (m.actual?.totalExpense || 0) : null,
        "Cum Savings": m.status !== "upcoming" ? Math.round(cumulativeSavings) : null,
        "Target Savings": Math.round(cumulativeTarget),
      };
    });
  }, [plan]);

  if (loading) {
    return <Loader label="Loading annual planner..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2 select-none">
            <CalendarDays className="h-6 w-6 text-[var(--electric)]" />
            Annual Planner
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">High-level financial targets and yearly variance analyses.</p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto select-none bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] p-1">
          <button onClick={() => setYear(year - 1)} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono font-bold text-sm text-[var(--text-primary)] px-2">{year}</span>
          <button onClick={() => setYear(year + 1)} className="rounded-lg p-2 text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Buttons Block */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={handleAutoFill} loading={actionLoading} className="flex items-center gap-1.5 text-xs text-[var(--electric)] bg-[var(--electric-soft)] hover:bg-white/5 cursor-pointer">
          <Sparkles className="h-3.5 w-3.5" />
          Auto-Fill from History
        </Button>
        <Button variant="ghost" onClick={handleSyncActuals} loading={actionLoading} className="flex items-center gap-1.5 text-xs text-[var(--mint)] bg-[var(--mint-soft)] hover:bg-white/5 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync Actuals
        </Button>
        <Button variant="ghost" onClick={() => setLinkGoalOpen(true)} className="flex items-center gap-1.5 text-xs text-[var(--solar)] bg-[var(--solar-soft)] hover:bg-white/5 cursor-pointer">
          <Target className="h-3.5 w-3.5" />
          Link Savings Goal
        </Button>
      </div>

      {/* Insights/Stats Cards */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-[var(--electric)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Annual Income Target</p>
            <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-1">₹{(plan?.annualIncome || 0).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">YTD Actual: ₹{(analysis.ytd?.income?.actual || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--flame)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Annual Expense Budget</p>
            <p className="text-xl font-bold text-[var(--text-primary)] font-mono mt-1">₹{(plan?.annualExpense || 0).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">YTD Spent: ₹{(analysis.ytd?.expense?.actual || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--mint)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Annual Savings Goal</p>
            <p className="text-xl font-bold text-[var(--mint)] font-mono mt-1">₹{(plan?.annualSavings || 0).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">YTD Saved: ₹{(analysis.ytd?.savings?.actual || 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-[var(--solar)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Months Remaining</p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{(analysis.remainingMonths || 0)} months left</p>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">Projected Savings: ₹{(analysis.projected?.savings || 0).toLocaleString()}</p>
          </Card>
        </div>
      )}

      {/* Composed Chart */}
      {plan && (
        <Card header="Year at a Glance — Projections vs Trends" className="p-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                <XAxis dataKey="name" stroke={chartTheme.textColor} fontSize={9} />
                <YAxis stroke={chartTheme.textColor} fontSize={9} />
                <Tooltip contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, fontSize: "10px", color: chartTheme.tooltipText }} />
                <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                <Bar dataKey="Planned Exp" fill={chartTheme.colors[1]} opacity={0.15} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual Exp" fill={chartTheme.expenseColor} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Cum Savings" stroke={chartTheme.incomeColor} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Target Savings" stroke={chartTheme.textColor} strokeDasharray="4 4" strokeWidth={1} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 12-Month Plan Grid */}
      {plan && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">12-Month Plan Grid</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plan.months.map((m) => {
              const borderHighlight = m.status === "in_progress" ? "border-[var(--electric)] shadow-[0_0_10px_var(--electric-soft)]" : "border-[var(--border-subtle)]";
              const statusColor = m.status === "completed" ? "bg-[var(--mint)]" : (m.status === "in_progress" ? "bg-[var(--electric)] animate-pulse" : "bg-[var(--text-dim)]");
              
              const isExpenseOver = m.status !== "upcoming" && m.actual.totalExpense > m.planned.totalExpense;

              return (
                <Card
                  key={m.month}
                  className={`p-4 bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer relative overflow-hidden ${borderHighlight}`}
                  onClick={() => handleEditMonthOpen(m)}
                >
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className="font-headline font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                      {MONTH_NAMES[m.month - 1]}
                    </span>
                    <button className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-0.5 cursor-pointer">
                      <Edit2 className="h-3 w-3" />
                      Plan
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-1">
                      <span>Target / Type</span>
                      <span>Planned</span>
                      {m.status !== "upcoming" && <span>Actual</span>}
                                 <div className="flex justify-between items-center">
                      <span className="text-[var(--text-dim)] font-medium">Income</span>
                      <span className="font-mono text-[var(--text-primary)]">₹{(m.planned?.income || 0).toLocaleString()}</span>
                      {m.status !== "upcoming" && (
                        <span className="font-mono text-[var(--mint)]">₹{(m.actual?.income || 0).toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-dim)] font-medium">Expenses</span>
                      <span className="font-mono text-[var(--text-primary)]">₹{(m.planned?.totalExpense || 0).toLocaleString()}</span>
                      {m.status !== "upcoming" && (
                        <span className={`font-mono ${isExpenseOver ? "text-[var(--flame)]" : "text-[var(--text-primary)]"}`}>
                          ₹{(m.actual?.totalExpense || 0).toLocaleString()}
                        </span>
                      )}
                    </div>                  </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-dim)] font-medium">Savings</span>
                      <span className="font-mono text-[var(--mint)]">₹{(m.planned?.savings || 0).toLocaleString()}</span>
                      {m.status !== "upcoming" && (
                        <span className="font-mono text-[var(--mint)]">₹{(m.actual?.savings || 0).toLocaleString()}</span>
                      )}
                    </div>

                    {m.status !== "upcoming" && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between text-[10px] font-mono select-none">
                        <span className="text-[var(--text-dim)]">Variance:</span>
                        <span className={(m.variance?.expense || 0) > 0 ? "text-[var(--flame)]" : "text-[var(--mint)]"}>
                          {(m.variance?.expense || 0) > 0 ? "↑" : "↓"} ₹{Math.abs(m.variance?.expense || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations & Advice */}
      {recs.length > 0 && (
        <Card header="Smart Planning Recommendations" className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recs.map((r, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <span className="text-2xl select-none shrink-0">{r.emoji}</span>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{r.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{r.advice}</p>
                  <p className="text-[10px] font-bold font-mono text-[var(--mint)] pt-1">Estimated Impact: {r.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==========================================
          MODAL: EDIT MONTH PLANNING BUDGETS
          ========================================== */}
      <Modal isOpen={Boolean(editMonth)} onClose={() => setEditMonth(null)} title={editMonth ? `Edit Limits — ${MONTH_NAMES[editMonth.month - 1]}` : "Edit Limits"}>
        {editMonth && (
          <form onSubmit={handleSaveMonth} className="space-y-4">
            <Input
              label="Planned Income (₹)"
              type="number"
              value={monthForm.plannedIncome}
              onChange={e => setMonthForm({ ...monthForm, plannedIncome: e.target.value })}
              required
            />

            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] max-h-60 overflow-y-auto pr-1 scrollbar-none">
              <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Planned Category Budgets</span>
              {monthForm.expenses.map((exp, idx) => (
                <div key={idx} className="flex gap-2 items-center rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex-1 truncate">{exp.category}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-dim)] text-xs font-bold font-mono">₹</span>
                    <input
                      type="number"
                      value={exp.amount}
                      onChange={e => {
                        const next = [...monthForm.expenses];
                        next[idx].amount = e.target.value;
                        setMonthForm({ ...monthForm, expenses: next });
                      }}
                      className="w-24 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-right font-mono text-xs text-[var(--text-primary)] px-2 focus:border-[var(--border-focus)] focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button variant="ghost" type="button" onClick={() => setEditMonth(null)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Save Month Projections</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==========================================
          MODAL: LINK SAVINGS GOAL
          ========================================== */}
      <Modal isOpen={linkGoalOpen} onClose={() => setLinkGoalOpen(false)} title="Link Savings Goal to Projections">
        <form onSubmit={handleLinkGoalSubmit} className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Select Savings Goal</span>
            <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] transition-all">
              <select
                value={goalToLink}
                onChange={e => setGoalToLink(e.target.value)}
                className="w-full rounded-[10px] border-0 bg-transparent py-3 px-4 text-xs text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer font-semibold"
                required
              >
                <option value="">-- Choose Goal --</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id} className="bg-[var(--bg-surface)]">
                    {goal.icon} {goal.title} (₹{goal.targetAmount})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-[var(--text-dim)] leading-relaxed mt-2">
              Linking a savings goal factors the calculated monthly rate into the planned savings requirements for remaining months.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" type="button" onClick={() => setLinkGoalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={actionLoading} disabled={!goalToLink}>Link Goal</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
export default AnnualPlanner;
