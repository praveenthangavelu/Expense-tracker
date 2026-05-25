import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
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

  if (loading) return <Loader label="Loading Family Settings..." />;

  // NO FAMILY VIEW
  if (!hasFamily) {
    return (
      <div className="mx-auto max-w-[650px] py-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white">Family Spending Networks</h2>
          <p className="text-slate-400 max-w-[500px] mx-auto text-sm sm:text-base leading-relaxed">
            Collaborate on budgets, track aggregate household expenses, and gain visual insights on category distributions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <button
            onClick={() => setCreateModalOpen(true)}
            className="glass flex flex-col items-center p-6 text-center rounded-3xl border border-white/5 hover:border-emerald-400/40 hover:bg-emerald-400/[0.02] transition duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 font-bold mb-3 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Plus className="h-6 w-6" />
            </div>
            <p className="font-bold text-white text-base mb-1">Create a Family</p>
            <p className="text-xs text-slate-500 max-w-[200px]">
              Become the admin, invite members, configure limits, and monitor all spendings.
            </p>
          </button>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="glass flex flex-col items-center p-6 text-center rounded-3xl border border-white/5 hover:border-violet-400/40 hover:bg-violet-400/[0.02] transition duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-400 text-slate-950 font-bold mb-3 shadow-[0_0_12px_rgba(167,139,250,0.3)]">
              <Share2 className="h-5 w-5" />
            </div>
            <p className="font-bold text-white text-base mb-1">Join a Family</p>
            <p className="text-xs text-slate-500 max-w-[200px]">
              Enter a unique invite code to link your transaction data with your family network.
            </p>
          </button>
        </motion.div>

        {/* Modals */}
        <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a Family">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Family Name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. Sharma Family"
              maxLength={50}
              required
            />
            <Button type="submit" className="w-full">Create</Button>
          </form>
        </Modal>

        <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Join a Family">
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Invite Code (8 alphanumeric characters)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. 7fbc265e"
              maxLength={8}
              required
            />
            <Button type="submit" className="w-full">Join</Button>
          </form>
        </Modal>
      </div>
    );
  }

  // HAS FAMILY VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <span>{family?.name}</span>
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300 font-semibold uppercase tracking-wider">
              {user?.familyRole}
            </span>
          </h2>
          <p className="text-slate-500 text-sm">Collaborative network dashboard</p>
        </div>

        <Button variant="danger" onClick={() => setConfirmLeaveOpen(true)}>
          <LogOut className="h-4 w-4" />
          Leave Family
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          {/* Members List */}
          <Card header={<h3 className="font-display text-lg font-bold text-white flex items-center gap-2"><Users className="h-5 w-5 text-emerald-400" /> Members List</h3>}>
            <div className="space-y-3">
              {family?.members?.map((m) => (
                <div
                  key={m.user._id}
                  className="flex items-center justify-between rounded-2xl bg-white/[0.02] p-3 border border-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 font-bold text-slate-950 text-sm">
                      {initials(m.user.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                        {m.user.name}
                        {m.role === "admin" && (
                          <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" title="Family Admin" />
                        )}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">{m.user.email}</p>
                    </div>
                  </div>

                  {isAdmin && m.user._id !== user.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmTransferUser(m.user)}
                        className="rounded-xl px-2.5 py-1 text-xs font-bold text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 transition"
                      >
                        Make Admin
                      </button>
                      <button
                        onClick={() => setConfirmRemoveUser(m.user)}
                        className="rounded-xl p-2 text-red-300 bg-red-400/5 hover:bg-red-400/10 transition"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Invitation Box */}
          <Card header={<h3 className="font-display text-lg font-bold text-white flex items-center gap-2"><Share2 className="h-5 w-5 text-emerald-400" /> Invite Code</h3>}>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              {isAdmin
                ? "Share this invite code with your family members so they can link their accounts."
                : "Only the family admin can regenerate codes. You can copy the code below to share."}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-2xl bg-white/[0.04] p-3 text-center border border-white/5 font-mono text-lg font-bold text-white tracking-wider select-all">
                {family?.inviteCode || "••••••••"}
              </div>
              <button
                onClick={handleCopyCode}
                disabled={!family?.inviteCode}
                className="rounded-2xl bg-emerald-400 p-3 text-slate-950 hover:bg-emerald-300 transition shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
              {isAdmin && (
                <button
                  onClick={regenerateCode}
                  className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-white hover:bg-white/[0.08] transition"
                  title="Regenerate Invite Code"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Family Settings (Admin only) */}
        {isAdmin && (
          <Card header={<h3 className="font-display text-lg font-bold text-white flex items-center gap-2"><Settings className="h-5 w-5 text-emerald-400" /> Family Settings</h3>}>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer rounded-2xl bg-white/[0.02] p-4 border border-white/[0.03]">
                <div className="space-y-0.5 pr-2">
                  <span className="text-sm font-semibold text-slate-200">Members Can View Family Summary</span>
                  <p className="text-xs text-slate-500">Allows non-admin family members to see the reports dashboard.</p>
                </div>
                <input
                  type="checkbox"
                  checked={membersCanViewSummary}
                  onChange={(e) => setMembersCanViewSummary(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.04] text-emerald-400 focus:ring-emerald-400 h-5 w-5"
                />
              </label>

              <Input
                label="Family Monthly Budget Limit (₹)"
                type="number"
                value={monthlyBudget === "0" ? "" : monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="No family limit (0)"
              />

              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* DASHBOARD SUMMARY REPORT */}
      {(isAdmin || family?.settings?.membersCanViewFamilySummary) && (
        <div className="space-y-6">
          <hr className="border-white/5 my-8" />
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span>Family Spending Reports</span>
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm">Consolidated analytics reports from all members.</p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-white py-2 px-3 text-xs sm:text-sm font-semibold focus:border-emerald-400 focus:ring-emerald-400"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "short" })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-white py-2 px-3 text-xs sm:text-sm font-semibold focus:border-emerald-400 focus:ring-emerald-400"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {summaryLoading ? (
            <Loader label="Compiling aggregate reports..." />
          ) : !familySummary ? (
            <div className="glass rounded-3xl p-10 text-center text-slate-500">
              No transactions recorded for this month.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Balance Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["income", "Combined Income", familySummary.familyBalance.totalIncome],
                  ["expense", "Combined Expenses", familySummary.familyBalance.totalExpense],
                  ["balance", "Net Family Balance", familySummary.familyBalance.balance],
                ].map(([type, label, val]) => (
                  <motion.div
                    key={type}
                    variants={itemVariants}
                    className={`glass border rounded-3xl p-5 border-l-4 ${
                      type === "income"
                        ? "border-l-emerald-400"
                        : type === "expense"
                        ? "border-l-red-400"
                        : "border-l-violet-400"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium text-slate-400">{label}</p>
                    <p className="amount mt-2 text-2xl sm:text-3xl font-bold text-white">
                      {formatCurrency(val)}
                    </p>
                    {type === "expense" && family?.settings?.monthlyBudget > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
                          <span>Limit: {formatCurrency(family.settings.monthlyBudget)}</span>
                          <span>
                            {Math.round((val / family.settings.monthlyBudget) * 100)}% used
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              val >= family.settings.monthlyBudget
                                ? "bg-red-400"
                                : val >= family.settings.monthlyBudget * 0.8
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            }`}
                            style={{
                              width: `${Math.min(
                                (val / family.settings.monthlyBudget) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Members spending breakdown table */}
              <motion.div variants={itemVariants}>
                <Card header={<h3 className="font-display text-lg font-bold text-white">Per-member Spending Breakdown</h3>}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs uppercase text-slate-500 border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4 text-right">Income</th>
                          <th className="py-3 px-4 text-right">Expense</th>
                          <th className="py-3 px-4 text-right">Balance</th>
                          <th className="py-3 px-4 text-right">% of Family Spending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {familySummary.memberBreakdown.map((m) => {
                          const spendingPct = totalSpending > 0 ? Math.round((m.expense / totalSpending) * 100) : 0;
                          return (
                            <tr key={m.userId} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-4 font-semibold text-white">
                                {m.name}
                              </td>
                              <td className="py-3 px-4 text-right amount text-emerald-400">
                                {formatCurrency(m.income)}
                              </td>
                              <td className="py-3 px-4 text-right amount text-red-400">
                                {formatCurrency(m.expense)}
                              </td>
                              <td className="py-3 px-4 text-right amount text-slate-200">
                                {formatCurrency(m.balance)}
                              </td>
                              <td className="py-3 px-4 text-right amount font-bold text-slate-400">
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

              {/* Charts grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                <motion.div variants={itemVariants}>
                  <Card header={<h3 className="font-display text-lg font-bold text-white">Income vs Expense comparison</h3>}>
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={familySummary.memberBreakdown}>
                          <XAxis dataKey="name" stroke="#8B8FA3" tickLine={false} axisLine={false} />
                          <YAxis stroke="#8B8FA3" tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              background: "#151823",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "16px",
                            }}
                          />
                          <Bar dataKey="expense" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="income" fill="#10B981" name="Income" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card header={<h3 className="font-display text-lg font-bold text-white">Family Spending distribution</h3>}>
                    <div className="h-64 mt-2 flex items-center justify-center">
                      {pieChartData.length ? (
                        <div className="w-full h-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                  background: "#151823",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "16px",
                                }}
                              />
                              <Pie
                                data={pieChartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell
                                    key={entry.name}
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                    stroke="transparent"
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                            <div>
                              <p className="text-xs text-slate-500">Expenses</p>
                              <p className="amount text-base font-bold text-white">
                                {formatCurrency(totalSpending)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500">No category transactions</p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Stacked comparison bar chart */}
              {stackedChartData.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card header={<h3 className="font-display text-lg font-bold text-white">Member Category comparison</h3>}>
                    <div className="h-72 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stackedChartData}>
                          <XAxis dataKey="name" stroke="#8B8FA3" tickLine={false} axisLine={false} />
                          <YAxis stroke="#8B8FA3" tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                              background: "#151823",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "16px",
                            }}
                          />
                          {uniqueCategories.map((cat, idx) => (
                            <Bar
                              key={cat}
                              dataKey={cat}
                              stackId="a"
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
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

      {/* Confirmation Dialogs */}
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
    </div>
  );
};

export default FamilyPage;
