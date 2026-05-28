import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Calendar, History, TrendingUp, AlertTriangle, CheckCircle, Pause, Play, Trash2, ArrowUpRight, ArrowDownRight, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import goalService from "../services/goalService";
import Loader from "../components/common/Loader";
import { formatCurrency } from "../utils/formatCurrency"; // fallback if not exist: we can build it inline
import { toInputDate } from "../utils/formatDate";
import { useChartTheme } from "../hooks/useChartTheme";

const EMOJIS = ["🎯", "🏠", "✈️", "💻", "🚗", "📱", "🎓", "💍", "🏋️", "🎸", "💼", "🏖️", "🚲", "🍕", "🎁", "🐾", "🎨", "🩺", "🔋", "💎"];
const COLORS = ["#63E4B5", "#7C6FFF", "#FF6B6B", "#FFB347", "#47C9FF", "#A855F7", "#EC4899", "#EAB308"];

export const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartTheme = useChartTheme();

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [savingsType, setSavingsType] = useState("add"); // "add" or "withdraw"
  const [savingsForm, setSavingsForm] = useState({ amount: "", note: "" });

  // Add Goal Form State
  const [form, setForm] = useState({
    title: "",
    targetAmount: "",
    duration: "6_months",
    targetDate: "",
    icon: "🎯",
    color: "#63E4B5",
    priority: "medium",
    autoDeduct: false,
    autoDeductFrequency: "monthly",
    autoDeductAmount: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalsRes, recsRes, insRes] = await Promise.all([
        goalService.getAll(),
        goalService.getRecommendations(),
        goalService.getInsights(),
      ]);
      setGoals(goalsRes.data || []);
      setRecommendations(recsRes.data || []);
      setInsights(insRes.data || null);
    } catch (err) {
      toast.error("Failed to load savings goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.targetAmount) return;

    try {
      const payload = {
        ...form,
        targetAmount: Number(form.targetAmount),
        autoDeductAmount: form.autoDeduct ? Number(form.autoDeductAmount) : 0,
      };
      if (form.duration !== "custom") {
        delete payload.targetDate;
      }
      await goalService.create(payload);
      toast.success("Savings goal created!");
      setAddOpen(false);
      setForm({
        title: "",
        targetAmount: "",
        duration: "6_months",
        targetDate: "",
        icon: "🎯",
        color: "#63E4B5",
        priority: "medium",
        autoDeduct: false,
        autoDeductFrequency: "monthly",
        autoDeductAmount: "",
      });
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to create savings goal");
    }
  };

  const handlePauseResume = async (id) => {
    try {
      await goalService.pauseResume(id);
      toast.success("Goal status updated!");
      loadData();
      if (selectedGoal && selectedGoal._id === id) {
        setDetailOpen(false);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this goal?")) return;
    try {
      await goalService.remove(id);
      toast.success("Goal cancelled");
      setDetailOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed to delete goal");
    }
  };

  const handleSavingsSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(savingsForm.amount);
    if (!amount || amount <= 0) return;

    try {
      let res;
      if (savingsType === "add") {
        res = await goalService.addSavings(selectedGoal._id, { amount, note: savingsForm.note });
        toast.success(`Deposited ₹${amount}!`);
        if (res.milestone) {
          toast(`🎉 Milestone reached: ${res.milestone.percent}% complete!`, { icon: "🏆", duration: 5000 });
        }
      } else {
        await goalService.withdrawSavings(selectedGoal._id, { amount, note: savingsForm.note });
        toast.success(`Withdrew ₹${amount}!`);
      }
      setSavingsOpen(false);
      setSavingsForm({ amount: "", note: "" });
      loadData();
      // Refresh detail view
      const updatedGoals = await goalService.getAll();
      const nextGoal = updatedGoals.data.find(g => g._id === selectedGoal._id);
      if (nextGoal) setSelectedGoal(nextGoal);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const getFeasibilityColor = (score) => {
    if (score === "easy") return "text-[var(--mint)] bg-[var(--mint-soft)] border-[rgba(99,228,181,0.2)]";
    if (score === "challenging") return "text-[var(--solar)] bg-[var(--solar-soft)] border-[rgba(255,179,71,0.2)]";
    if (score === "tight") return "text-orange-400 bg-orange-950/20 border-orange-900/40";
    return "text-[var(--flame)] bg-[var(--flame-soft)] border-[rgba(255,107,107,0.2)]";
  };

  const activeGoalsCount = goals.filter(g => g.status === "active").length;
  const completedGoalsCount = goals.filter(g => g.status === "completed").length;

  if (loading) {
    return <Loader label="Loading savings goals..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-12"
    >
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2 select-none">
            <Target className="h-6 w-6 text-[var(--mint)]" />
            Savings Goals
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">Automated visual planners to crush your savings targets.</p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)} className="flex items-center gap-2 shadow-[var(--shadow-glow-mint)] shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4 stroke-[3px]" />
          Create Savings Goal
        </Button>
      </div>

      {/* 2. Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[var(--mint)]">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Saved</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono mt-1">₹{(insights?.totalSaved || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-[var(--electric)]">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Active Goals</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{activeGoalsCount} in progress</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-[var(--solar)]">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Goals Achieved</p>
          <p className="text-2xl font-bold text-[var(--solar)] mt-1 flex items-center gap-1.5 font-sans">
            {completedGoalsCount} completed 🏆
          </p>
        </Card>
      </div>

      {/* 3. Goals Card List Grid */}
      {goals.length === 0 ? (
        <Card className="p-8 text-center text-[var(--text-secondary)] bg-[var(--bg-surface)]">
          <Target className="h-12 w-12 text-[var(--text-dim)] mx-auto mb-3" />
          <p className="text-base font-semibold text-[var(--text-primary)]">No savings goals yet</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Set a timeline and automatically deduct funds to secure your goals.</p>
          <Button variant="primary" onClick={() => setAddOpen(true)} className="mt-4 mx-auto">
            Set First Savings Goal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const metrics = goal.metrics;
            const strokeColor = goal.color;
            const radius = 40;
            const strokeWidth = 8;
            const circ = 2 * Math.PI * radius;
            const strokeDashoffset = circ - (metrics.percentComplete / 100) * circ;

            // Track status colors
            let trackColor = "var(--mint)";
            let trackBg = "var(--mint-soft)";
            let trackLabel = "On Track ✅";
            if (goal.status === "completed") {
              trackColor = "var(--solar)";
              trackBg = "var(--solar-soft)";
              trackLabel = "Achieved! 🏆";
            } else if (metrics.percentComplete < metrics.percentTimeElapsed * 0.7) {
              trackColor = "var(--flame)";
              trackBg = "var(--flame-soft)";
              trackLabel = "At Risk 🚨";
            } else if (!metrics.onTrack) {
              trackColor = "var(--solar)";
              trackBg = "var(--solar-soft)";
              trackLabel = "Behind ⚠️";
            }

            return (
              <motion.div
                key={goal._id}
                whileHover={{ scale: 1.01 }}
                className="relative overflow-hidden rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-6 transition-all duration-300 shadow-lg cursor-pointer"
                onClick={() => {
                  setSelectedGoal(goal);
                  setDetailOpen(true);
                }}
              >
                <div className="flex gap-4 items-start">
                  {/* Circular ring SVG */}
                  <div className="relative h-20 w-20 shrink-0">
                    <svg className="h-full w-full rotate-270" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--bg-base)" strokeWidth={strokeWidth} />
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circ}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                      <span className="text-[28px] select-none leading-none">{goal.icon}</span>
                      <span className="text-[10px] font-bold text-[var(--text-primary)] mt-0.5">{metrics.percentComplete}%</span>
                    </div>
                  </div>

                  {/* Title & Priority */}
                  <div className="flex-grow space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display text-base font-bold text-[var(--text-primary)] truncate pr-2">{goal.title}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border shrink-0`} style={{ borderColor: trackColor, color: trackColor }}>
                        {goal.priority}
                      </span>
                    </div>
                    <p className="text-sm font-semibold font-mono text-[var(--text-secondary)]">
                      ₹{(goal.savedAmount || 0).toLocaleString()} <span className="text-[var(--text-dim)] font-medium">/ ₹{(goal.targetAmount || 0).toLocaleString()}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-[var(--text-dim)]">
                      ₹{Math.max(0, (goal.targetAmount || 0) - (goal.savedAmount || 0)).toLocaleString()} left to save
                    </p>
                  </div>
                </div>

                {/* Progress bar metrics */}
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[var(--text-secondary)]">{(metrics.daysRemaining || 0)} days remaining</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: trackBg, color: trackColor }}>
                      {trackLabel}
                    </span>
                  </div>

                  {/* Visual progress bar */}
                  <div className="relative h-[6px] w-full rounded-full bg-[var(--progress-track)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${metrics.percentComplete || 0}%`, backgroundColor: trackColor }} />
                  </div>

                  {/* Rates */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-[var(--text-dim)]">
                    <div>
                      <p className="text-[var(--text-primary)] font-bold">₹{metrics.requiredDailyRate || 0}</p>
                      <p>daily rate</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] font-bold">₹{metrics.requiredWeeklyRate || 0}</p>
                      <p>weekly rate</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] font-bold">₹{metrics.requiredMonthlyRate || 0}</p>
                      <p>monthly rate</p>
                    </div>
                  </div>
                </div>

                {/* Milestones Dots */}
                <div className="mt-4 flex gap-1.5 justify-center">
                  {(goal.milestones || []).map((m, idx) => (
                    <div
                      key={idx}
                      title={`${m.percent}% reached`}
                      className="h-2 w-2 rounded-full border"
                      style={{
                        backgroundColor: m.reached ? goal.color : "transparent",
                        borderColor: m.reached ? goal.color : "var(--text-ghost)",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 4. Recommendation Panel */}
      {recommendations.length > 0 && (
        <Card header="Goal Feasibility Recommendations" className="p-6 mt-6">
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{rec.goalTitle}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Requires ₹{rec.requiredMonthlyRate}/month savings.
                  </p>
                </div>
                <span className={`px-3 py-1 text-[11px] font-semibold border rounded-full ${getFeasibilityColor(rec.score)}`}>
                  {rec.statusText}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==========================================
          MODAL: ADD SAVINGS GOAL
          ========================================== */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Savings Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Input label="Goal Title" placeholder="e.g. Goa Trip, New Macbook" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Input label="Target Amount (₹)" type="number" placeholder="e.g. 50000" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} required />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Duration</span>
              <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] transition-all">
                <select
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  className="w-full rounded-[10px] border-0 bg-transparent py-3 px-4 text-xs text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="1_month" className="bg-[var(--bg-surface)]">1 Month</option>
                  <option value="3_months" className="bg-[var(--bg-surface)]">3 Months</option>
                  <option value="6_months" className="bg-[var(--bg-surface)]">6 Months</option>
                  <option value="1_year" className="bg-[var(--bg-surface)]">1 Year</option>
                  <option value="2_years" className="bg-[var(--bg-surface)]">2 Years</option>
                  <option value="custom" className="bg-[var(--bg-surface)]">Custom Date</option>
                </select>
              </div>
            </div>

            {form.duration === "custom" && (
              <Input
                label="Target Date"
                type="date"
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
                required
              />
            )}
          </div>

          {/* Icon and color presets */}
          <div>
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Goal Icon</span>
            <div className="mt-2 grid grid-cols-10 gap-1 overflow-x-auto pb-2 scrollbar-none">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setForm({ ...form, icon: emoji })}
                  className={`h-8 w-8 text-lg flex items-center justify-center rounded-lg border transition-all ${form.icon === emoji ? "border-[var(--mint)] bg-[var(--mint-soft)]" : "border-transparent bg-[var(--bg-base)] hover:bg-[var(--bg-hover)]"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Goal Theme Color</span>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setForm({ ...form, color: color })}
                  className={`h-7 w-7 rounded-full border transition-all ${form.color === color ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Auto deduct toggles */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">Enable Auto-Savings Deduct</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Deducts automatically from monthly target budget.</p>
              </div>
              <input
                type="checkbox"
                checked={form.autoDeduct}
                onChange={e => setForm({ ...form, autoDeduct: e.target.checked })}
                className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-5 w-5 cursor-pointer"
              />
            </label>

            {form.autoDeduct && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Frequency</span>
                  <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] transition-all">
                    <select
                      value={form.autoDeductFrequency}
                      onChange={e => setForm({ ...form, autoDeductFrequency: e.target.value })}
                      className="w-full rounded-[10px] border-0 bg-transparent py-2.5 px-3 text-xs text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer"
                    >
                      <option value="daily" className="bg-[var(--bg-surface)]">Daily</option>
                      <option value="weekly" className="bg-[var(--bg-surface)]">Weekly</option>
                      <option value="monthly" className="bg-[var(--bg-surface)]">Monthly</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Deduct Amount (₹)"
                  type="number"
                  placeholder="e.g. 500"
                  value={form.autoDeductAmount}
                  onChange={e => setForm({ ...form, autoDeductAmount: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Goal</Button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL: GOAL DETAIL VIEW
          ========================================== */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Savings Goal Details">
        {selectedGoal && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl p-2 rounded-2xl bg-[var(--bg-base)] select-none border border-[var(--border-subtle)]">{selectedGoal.icon}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">{selectedGoal.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Status: <span className="font-semibold text-[var(--text-primary)]">{selectedGoal.status}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePauseResume(selectedGoal._id)}
                  title={selectedGoal.status === "active" ? "Pause goal" : "Resume goal"}
                  className="rounded-lg p-2 hover:bg-[var(--bg-hover)] text-white border border-[var(--border-subtle)]"
                >
                  {selectedGoal.status === "active" ? <Pause className="h-4 w-4 text-[var(--solar)]" /> : <Play className="h-4 w-4 text-[var(--mint)]" />}
                </button>
                <button
                  onClick={() => handleDelete(selectedGoal._id)}
                  title="Cancel goal"
                  className="rounded-lg p-2 hover:bg-[var(--flame-soft)] text-[var(--flame)] border border-[var(--border-subtle)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            {selectedGoal.status !== "completed" && (
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-1 bg-[var(--mint)] text-[#05060B] hover:bg-[#4dd2a1]"
                  onClick={() => {
                    setSavingsType("add");
                    setSavingsOpen(true);
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Add Savings
                </Button>
                {selectedGoal.savedAmount > 0 && (
                  <Button
                    variant="danger"
                    className="flex-1 flex items-center justify-center gap-1 border border-[var(--flame)] hover:bg-[var(--flame-soft)]"
                    onClick={() => {
                      setSavingsType("withdraw");
                      setSavingsOpen(true);
                    }}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Withdraw
                  </Button>
                )}
              </div>
            )}

            {/* Chart showing actual vs ideal straight line */}
            <div className="h-44 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    (() => {
                      const data = [];
                      const target = selectedGoal.targetAmount;
                      const start = new Date(selectedGoal.startDate);
                      const end = new Date(selectedGoal.targetDate);
                      const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

                      // Generate ideal path
                      data.push({ name: "Start", Ideal: 0, Actual: 0 });

                      // Map actual history logs
                      let currentSaved = 0;
                      (selectedGoal.history || []).forEach((h, i) => {
                        const hDate = new Date(h.date);
                        const elapsed = Math.round((hDate - start) / (1000 * 60 * 60 * 24));
                        const idealAtThisPoint = (target / totalDays) * elapsed;

                        if (h.type === "manual_add" || h.type === "auto_deduct") {
                          currentSaved += h.amount;
                        } else if (h.type === "manual_withdraw") {
                          currentSaved -= h.amount;
                        }

                        data.push({
                          name: hDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                          Ideal: Math.round(idealAtThisPoint),
                          Actual: currentSaved,
                        });
                      });

                      // Add final target point
                      data.push({ name: "Deadline", Ideal: target, Actual: selectedGoal.savedAmount });
                      return data;
                    })()
                  }
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                  <XAxis dataKey="name" stroke={chartTheme.textColor} fontSize={9} />
                  <YAxis stroke={chartTheme.textColor} fontSize={9} />
                  <Tooltip contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "12px", fontSize: "10px", color: chartTheme.tooltipText }} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Line type="monotone" dataKey="Actual" stroke={selectedGoal.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Ideal" stroke="#777" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Savings History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1 select-none">
                <History className="h-4 w-4" />
                Savings History
              </h4>
              <div className="max-h-40 overflow-y-auto pr-1 space-y-2 scrollbar-none">
                {((selectedGoal.history || [])).length === 0 ? (
                  <p className="text-xs text-[var(--text-dim)] text-center py-4">No deposits or withdrawals yet.</p>
                ) : (
                  [...(selectedGoal.history || [])].reverse().map((hist, i) => (
                    <div key={i} className="flex justify-between items-center gap-2 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-xs">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {hist.type === "manual_add" && "manual deposit"}
                          {hist.type === "auto_deduct" && "auto deduction"}
                          {hist.type === "manual_withdraw" && "withdrawal"}
                          {hist.type === "adjustment" && "adjustment"}
                        </p>
                        <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
                          {new Date(hist.date).toLocaleString()}
                        </p>
                      </div>
                      <span className={`font-mono font-bold ${hist.type.includes("withdraw") ? "text-[var(--flame)]" : "text-[var(--mint)]"}`}>
                        {hist.type.includes("withdraw") ? "-" : "+"}₹{hist.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==========================================
          MODAL: DEPOSIT / WITHDRAW FUNDS
          ========================================== */}
      <Modal isOpen={savingsOpen} onClose={() => setSavingsOpen(false)} title={savingsType === "add" ? "Deposit Savings" : "Withdraw Savings"}>
        <form onSubmit={handleSavingsSubmit} className="space-y-4">
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="e.g. 5000"
            value={savingsForm.amount}
            onChange={e => setSavingsForm({ ...savingsForm, amount: e.target.value })}
            required
          />
          <Input
            label="Note"
            placeholder="e.g. Monthly transfer, unexpected savings"
            value={savingsForm.note}
            onChange={e => setSavingsForm({ ...savingsForm, note: e.target.value })}
          />

          <div className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" type="button" onClick={() => setSavingsOpen(false)}>Cancel</Button>
            <Button variant={savingsType === "add" ? "primary" : "danger"} type="submit">
              {savingsType === "add" ? "Confirm Deposit" : "Confirm Withdrawal"}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
export default Goals;
