import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Crown,
  Trash2,
  Settings,
  Share2,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  TrendingUp,
  Plus,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import { useAuth } from "../context/AuthContext";
import { useFamilyContext } from "../context/FamilyContext";
import { CHART_COLORS } from "../utils/constants";
import { formatCurrency } from "../utils/formatCurrency";
import { useChartTheme } from "../hooks/useChartTheme";

const initials = (name) => {
  if (!name || typeof name !== "string") return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export const FamilyPage = () => {
  const { user } = useAuth();
  const {
    family,
    familySummary,
    loading,
    summaryLoading,
    createFamily,
    joinFamily,
    leaveFamily,
    removeMember,
    transferAdmin,
    fetchSummary,
    updateSettings,
    regenerateCode,
  } = useFamilyContext();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState(null);
  const [confirmTransferUser, setConfirmTransferUser] = useState(null);
  
  const [copied, setCopied] = useState(false);
  const [membersCanViewSummary, setMembersCanViewSummary] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const chartTheme = useChartTheme();
  const colorsPalette = chartTheme.colors;

  const isAdmin = user?.familyRole === "admin";
  const hasFamily = Boolean(user?.family);

  // Sync settings when family updates
  useEffect(() => {
    if (family?.settings) {
      setMembersCanViewSummary(family.settings.membersCanViewFamilySummary);
      setMonthlyBudget(String(family.settings.monthlyBudget || ""));
    }
  }, [family]);

  // Load summary reports
  useEffect(() => {
    if (hasFamily && (isAdmin || family?.settings?.membersCanViewFamilySummary)) {
      fetchSummary(selectedMonth, selectedYear);
    }
  }, [hasFamily, isAdmin, family, selectedMonth, selectedYear, fetchSummary]);

  const handleCopyCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    try {
      await createFamily({ name: familyName.trim() });
      setCreateModalOpen(false);
      setFamilyName("");
    } catch {}
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || inviteCode.trim().length !== 8) {
      toast.error("Invite code must be exactly 8 characters");
      return;
    }
    try {
      await joinFamily({ inviteCode: inviteCode.trim() });
      setJoinModalOpen(false);
      setInviteCode("");
    } catch {}
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        membersCanViewFamilySummary: membersCanViewSummary,
        monthlyBudget: Number(monthlyBudget) || 0,
      });
      toast.success("Family settings updated!");
    } catch {}
  };

  // Stacked chart data calculations
  const stackedChartData = useMemo(() => {
    if (!familySummary?.memberCategoryBreakdown) return [];
    const memberGroups = {};
    familySummary.memberCategoryBreakdown.forEach((item) => {
      memberGroups[item.name] ||= { name: item.name };
      memberGroups[item.name][item.category] = item.total;
    });
    return Object.values(memberGroups);
  }, [familySummary]);

  const uniqueCategories = useMemo(() => {
    if (!familySummary?.memberCategoryBreakdown) return [];
    return [...new Set(familySummary.memberCategoryBreakdown.map((item) => item.category))];
  }, [familySummary]);

  const pieChartData = useMemo(() => {
    if (!familySummary?.familyCategoryBreakdown) return [];
    return familySummary.familyCategoryBreakdown.map((item) => ({
      name: item._id,
      value: item.total,
    }));
  }, [familySummary]);

  const totalSpending = useMemo(() => {
    if (!pieChartData.length) return 0;
    return pieChartData.reduce((sum, item) => sum + item.value, 0);
  }, [pieChartData]);

  // Find spending for a specific member
  const memberExpenses = useMemo(() => {
    const expenses = {};
    if (familySummary?.memberBreakdown) {
      familySummary.memberBreakdown.forEach((m) => {
        expenses[m.userId] = m.expense;
      });
    }
    return expenses;
  }, [familySummary]);

  if (loading) return <Loader label="Loading Family Hub..." />;

  // NO FAMILY VIEW
  if (!hasFamily) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="mx-auto max-w-[500px] py-8 sm:py-14 space-y-8"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--electric-soft)] text-[var(--electric)] border border-[rgba(124,111,255,0.2)] shadow-[var(--shadow-glow-electric)]">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Family Hub</h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium max-w-[420px] mx-auto leading-relaxed">
            Collaborate on budgets, track aggregate household expenses, and gain visual insights on category distributions.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="group relative flex flex-col items-start p-6 text-left rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:border-[var(--mint)] transition-all duration-300 select-none cursor-pointer"
          >
            {/* Corner dot decoration */}
            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[var(--mint)] opacity-0 group-hover:opacity-60 transition-opacity" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.15)] mb-4">
              <Plus className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-base mb-1 flex items-center gap-1">
              Create a Family <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
              Become the admin, invite members, configure limits, and monitor household financial trends.
            </p>
          </button>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="group relative flex flex-col items-start p-6 text-left rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:border-[var(--electric)] transition-all duration-300 select-none cursor-pointer"
          >
            {/* Corner dot decoration */}
            <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[var(--electric)] opacity-0 group-hover:opacity-60 transition-opacity" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--electric-soft)] text-[var(--electric)] border border-[rgba(124,111,255,0.15)] mb-4">
              <UserPlus className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-base mb-1 flex items-center gap-1">
              Join a Family <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
              Enter a unique invite code to link your transaction data and participate in a shared budget.
            </p>
          </button>
        </div>

        {/* Modals */}
        <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a Family">
          <form onSubmit={handleCreate} className="space-y-5">
            <Input
              label="Family Name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. Sharma Family"
              maxLength={50}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create Family</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Join a Family">
          <form onSubmit={handleJoin} className="space-y-5">
            <Input
              label="Invite Code (8 alphanumeric characters)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. 7fbc265e"
              maxLength={8}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setJoinModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="electric">Join Family</Button>
            </div>
          </form>
        </Modal>
      </motion.div>
    );
  }

  // HAS FAMILY VIEW
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className="space-y-6"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {family?.name}
            </h2>
            <span className={clsx(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
              isAdmin
                ? "bg-[var(--mint-soft)] text-[var(--mint)] border-[rgba(99,228,181,0.2)] shadow-[var(--shadow-glow-mint)]"
                : "bg-[var(--electric-soft)] text-[var(--electric)] border-[rgba(124,111,255,0.2)] shadow-[var(--shadow-glow-electric)]"
            )}>
              {isAdmin ? "Head of Family" : "Family Member"}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">Collaborative network dashboard</p>
        </div>

        <Button variant="ghost" onClick={() => setConfirmLeaveOpen(true)} className="h-10 border border-[rgba(255,107,107,0.15)] text-[var(--flame)] hover:bg-[var(--flame-soft)] hover:border-[var(--flame)]">
          <LogOut className="h-4 w-4 mr-1 shrink-0" />
          Leave Family
        </Button>
      </div>

      {/* CORE INFO LAYOUT GRID */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          {/* Members List */}
          <Card
            header={
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--electric)]" />
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Family Members</h3>
              </div>
            }
          >
            <div className="space-y-2.5">
              {family?.members?.filter((m) => m?.user)?.map((m) => {
                const isSelf = m.user._id === (user?.id || user?._id);
                const expenseVal = memberExpenses[m.user._id] || 0;
                return (
                  <div
                    key={m.user._id}
                    className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--electric)] to-[var(--mint)] font-display font-bold text-white text-xs select-none shadow-[var(--shadow-sm)]">
                        {initials(m.user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-1.5 truncate">
                          <span>{m.user.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase bg-[var(--bg-surface)] px-1.5 py-0.5 rounded">You</span>
                          )}
                          {m.role === "admin" && (
                            <Crown className="h-3.5 w-3.5 text-[var(--solar)] fill-[var(--solar-soft)] shrink-0" title="Family Head" />
                          )}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{m.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {formatCurrency(expenseVal)}
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] font-bold">Spent this month</p>
                      </div>

                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConfirmTransferUser(m.user)}
                            className="rounded-lg px-2.5 h-8 text-[10px] font-bold text-[var(--solar)] bg-[var(--solar-soft)] hover:bg-[var(--solar-soft)] hover:text-white border border-[rgba(255,179,71,0.15)] transition cursor-pointer"
                          >
                            Make Admin
                          </button>
                          <button
                            onClick={() => setConfirmRemoveUser(m.user)}
                            className="rounded-lg p-2 text-[var(--text-secondary)] hover:text-[var(--flame)] hover:bg-[var(--flame-soft)] transition cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Invitation Box */}
          <Card
            header={
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-[var(--mint)]" />
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Invite Members</h3>
              </div>
            }
          >
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium mb-4">
              {isAdmin
                ? "Share this secure invite code with family members. They can enter it to link transaction databases."
                : "Ask the Head of Family to share this code. Regular members cannot regenerate invite codes."}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-[var(--bg-base)] py-3 px-4 text-center border border-[var(--border-default)] font-mono text-lg font-bold text-[var(--text-primary)] tracking-widest select-all relative overflow-hidden group">
                <span className="relative z-10">{family?.inviteCode || "••••••••"}</span>
                <div className="absolute inset-0 bg-[var(--electric-soft)] opacity-0 group-hover:opacity-20 transition-opacity" />
              </div>
              <button
                onClick={handleCopyCode}
                disabled={!family?.inviteCode}
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--mint-gradient)] text-slate-950 hover:brightness-105 transition shadow-[var(--shadow-glow-mint)] disabled:opacity-40 cursor-pointer shrink-0"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
              {isAdmin && (
                <button
                  onClick={regenerateCode}
                  className="h-12 w-12 flex items-center justify-center rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer shrink-0"
                  title="Regenerate Invite Code"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Family Settings (Admin only) */}
        {isAdmin ? (
          <Card
            header={
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[var(--electric)]" />
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Family Limits</h3>
              </div>
            }
          >
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Share Reports Dashboard</span>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-normal">Allows non-admin family members to view collective spending charts.</p>
                </div>
                <input
                  type="checkbox"
                  checked={membersCanViewSummary}
                  onChange={(e) => setMembersCanViewSummary(e.target.checked)}
                  className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--electric)] focus:ring-[var(--electric)] h-5 w-5 cursor-pointer"
                />
              </label>

              <Input
                label="Monthly Combined Household Budget Limit (₹)"
                type="number"
                value={monthlyBudget === "0" ? "" : monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="No family limit (0)"
              />

              <Button onClick={handleSaveSettings} variant="primary" className="w-full h-11">
                Save Budget Configuration
              </Button>
            </div>
          </Card>
        ) : (
          <Card
            header={
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--mint)]" />
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Information Policy</h3>
              </div>
            }
            className="flex flex-col justify-center"
          >
            <div className="rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] space-y-3">
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                You are a linked member of <strong className="text-[var(--text-primary)] font-bold">{family?.name}</strong>.
              </p>
              <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Your transactions are aggregated into household category reports.</li>
                <li>The head of family manages member lists and limit controls.</li>
                <li>Your private settings remain visible only to you.</li>
              </ul>
            </div>
          </Card>
        )}
      </div>

      {/* DASHBOARD SUMMARY REPORT SECTION */}
      {(isAdmin || family?.settings?.membersCanViewFamilySummary) && (
        <div className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--mint)]" />
                <span>Family Spending Summary</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Consolidated analytical breakdown from all members</p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] py-2 px-3 focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none cursor-pointer font-semibold"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-[var(--bg-surface)]">
                    {new Date(0, i).toLocaleString("en", { month: "short" })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] py-2 px-3 focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none cursor-pointer font-semibold"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-[var(--bg-surface)]">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {summaryLoading ? (
            <Loader label="Compiling aggregate reports..." />
          ) : !familySummary || !familySummary.familyBalance ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center text-[var(--text-secondary)] font-medium text-xs">
              No transactions recorded for the selected month.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Balance Cards (3 columns) */}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Combined Income",
                    val: familySummary.familyBalance.totalIncome,
                    variant: "glow-mint",
                    color: "text-[var(--mint)]",
                    icon: Wallet,
                  },
                  {
                    label: "Combined Expenses",
                    val: familySummary.familyBalance.totalExpense,
                    variant: "glow-flame",
                    color: "text-[var(--flame)]",
                    icon: TrendingDown,
                    budgetWidget: true,
                  },
                  {
                    label: "Combined Net Balance",
                    val: familySummary.familyBalance.balance,
                    variant: "glow-electric",
                    color: familySummary.familyBalance.balance >= 0 ? "text-[var(--mint)]" : "text-[var(--flame)]",
                    icon: TrendingUp,
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div key={card.label} variants={itemVariants}>
                      <Card variant={card.variant} className="p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">{card.label}</p>
                          <Icon className="h-4 w-4 text-[var(--text-dim)]" />
                        </div>
                        <p className={clsx("font-mono mt-3 text-2xl font-bold tracking-tight", card.color)}>
                          {formatCurrency(card.val)}
                        </p>

                        {card.budgetWidget && family?.settings?.monthlyBudget > 0 && (
                          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                            <div className="flex justify-between text-[10px] text-[var(--text-dim)] font-bold mb-1">
                              <span>LIMIT: {formatCurrency(family.settings.monthlyBudget)}</span>
                              <span>
                                {Math.round((card.val / family.settings.monthlyBudget) * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[var(--bg-base)] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  card.val >= family.settings.monthlyBudget
                                    ? "bg-[var(--flame)]"
                                    : card.val >= family.settings.monthlyBudget * 0.8
                                    ? "bg-[var(--solar)]"
                                    : "bg-[var(--mint)]"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (card.val / family.settings.monthlyBudget) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Table: Per-member breakdown */}
              <motion.div variants={itemVariants}>
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[var(--mint)]" />
                      <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Per-member Breakdown</h3>
                    </div>
                  }
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase tracking-wider font-bold">
                          <th className="pb-3 px-4">Member</th>
                          <th className="pb-3 px-4 text-right">Income</th>
                          <th className="pb-3 px-4 text-right">Expense</th>
                          <th className="pb-3 px-4 text-right">Balance</th>
                          <th className="pb-3 px-4 text-right">% of Family Spending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {familySummary.memberBreakdown.map((m) => {
                          const spendingPct = totalSpending > 0 ? Math.round((m.expense / totalSpending) * 100) : 0;
                          return (
                            <tr key={m.userId} className="hover:bg-[var(--bg-hover)] transition-all duration-200">
                              <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                                {m.name}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-[var(--mint)]">
                                {formatCurrency(m.income)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-[var(--flame)]">
                                {formatCurrency(m.expense)}
                              </td>
                              <td className={clsx("py-3.5 px-4 text-right font-mono font-semibold", m.balance >= 0 ? "text-[var(--text-primary)]" : "text-[var(--flame)]")}>
                                {formatCurrency(m.balance)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text-secondary)]">
                                {spendingPct}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>

              {/* Charts breakdown Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Bar Chart: member comparison */}
                <motion.div variants={itemVariants}>
                  <Card
                    header={
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[var(--electric)]" />
                        <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Member Comparison</h3>
                      </div>
                    }
                  >
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={familySummary.memberBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="name"
                            stroke={chartTheme.textColor}
                            tickLine={false}
                            axisLine={false}
                            style={{ fontSize: "10px", fontFamily: "var(--general-sans)" }}
                          />
                          <YAxis
                            stroke={chartTheme.textColor}
                            tickLine={false}
                            axisLine={false}
                            style={{ fontSize: "10px", fontFamily: "var(--geist-mono)" }}
                          />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              background: chartTheme.tooltipBg,
                              border: `1px solid ${chartTheme.tooltipBorder}`,
                              borderRadius: "12px",
                              fontFamily: "var(--general-sans)",
                              fontSize: "11px",
                              color: chartTheme.tooltipText
                            }}
                          />
                          <Bar dataKey="expense" fill={chartTheme.expenseColor} name="Expenses" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="income" fill={chartTheme.incomeColor} name="Income" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>

                {/* 2. Pie Chart: Spending breakdown */}
                <motion.div variants={itemVariants}>
                  <Card
                    header={
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-[var(--mint)]" />
                        <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Spending Distribution</h3>
                      </div>
                    }
                  >
                    <div className="h-64 mt-2 flex items-center justify-center relative">
                      {pieChartData.length ? (
                        <div className="w-full h-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                  background: chartTheme.tooltipBg,
                                  border: `1px solid ${chartTheme.tooltipBorder}`,
                                  borderRadius: "12px",
                                  fontFamily: "var(--general-sans)",
                                  fontSize: "11px",
                                  color: chartTheme.tooltipText
                                }}
                              />
                              <Pie
                                data={pieChartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={3}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell
                                    key={entry.name}
                                    fill={colorsPalette[index % colorsPalette.length]}
                                    stroke="transparent"
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Expenses</p>
                            <p className="font-mono text-base font-bold text-[var(--text-primary)] leading-tight mt-0.5">
                              {formatCurrency(totalSpending)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)] font-medium">No category spendings recorded.</p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* 3. Stacked comparison bar chart */}
              {stackedChartData.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card
                    header={
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--electric)]" />
                        <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Member Category breakdown</h3>
                      </div>
                    }
                  >
                    <div className="h-72 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stackedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="name"
                            stroke={chartTheme.textColor}
                            tickLine={false}
                            axisLine={false}
                            style={{ fontSize: "10px", fontFamily: "var(--general-sans)" }}
                          />
                          <YAxis
                            stroke={chartTheme.textColor}
                            tickLine={false}
                            axisLine={false}
                            style={{ fontSize: "10px", fontFamily: "var(--geist-mono)" }}
                          />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              background: chartTheme.tooltipBg,
                              border: `1px solid ${chartTheme.tooltipBorder}`,
                              borderRadius: "12px",
                              fontFamily: "var(--general-sans)",
                              fontSize: "11px",
                              color: chartTheme.tooltipText
                            }}
                          />
                          {uniqueCategories.map((cat, idx) => (
                            <Bar
                              key={cat}
                              dataKey={cat}
                              stackId="a"
                              fill={colorsPalette[idx % colorsPalette.length]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOGS */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        title="Leave family?"
        message={
          isAdmin && family?.members?.length > 1
            ? "You are the admin. You must transfer the admin role to another member before leaving."
            : "Are you sure you want to leave this family? You will no longer share budgets or view summaries."
        }
        confirmLabel="Leave"
        onCancel={() => setConfirmLeaveOpen(false)}
        onConfirm={async () => {
          try {
            await leaveFamily();
            setConfirmLeaveOpen(false);
          } catch {}
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmRemoveUser)}
        title="Remove member?"
        message={`Are you sure you want to remove ${confirmRemoveUser?.name} from the family?`}
        confirmLabel="Remove"
        onCancel={() => setConfirmRemoveUser(null)}
        onConfirm={async () => {
          try {
            await removeMember(confirmRemoveUser._id);
            setConfirmRemoveUser(null);
          } catch {}
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmTransferUser)}
        title="Transfer admin role?"
        message={`Are you sure you want to transfer the Head of Family role to ${confirmTransferUser?.name}? You will become a regular member.`}
        confirmLabel="Transfer"
        onCancel={() => setConfirmTransferUser(null)}
        onConfirm={async () => {
          try {
            await transferAdmin({ userId: confirmTransferUser._id });
            setConfirmTransferUser(null);
          } catch {}
        }}
      />
    </motion.div>
  );
};

export default FamilyPage;
