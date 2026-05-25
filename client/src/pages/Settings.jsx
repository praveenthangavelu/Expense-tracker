import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";
import { usePreferences } from "../hooks/usePreferences";
import { budgetService } from "../services/budgetService";
import { MONTH_NAMES } from "../utils/constants";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { categories, addCategory, deleteCategory } = useTransactions();
  const { preferences, updatePreference } = usePreferences();
  const [profile, setProfile] = useState({
    name: user?.name || "",
    currency: user?.currency || "INR",
  });
  const [categoryType, setCategoryType] = useState("expense");
  const [newCategory, setNewCategory] = useState({ name: "", icon: "📌" });
  const [deleting, setDeleting] = useState(null);
  const [dangerText, setDangerText] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);

  // Budget states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budget, setBudgetState] = useState({ overall: 0, categories: [] });
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    const loadBudget = async () => {
      try {
        const res = await budgetService.getBudget({ month: selectedMonth, year: selectedYear });
        if (res.data) {
          setBudgetState({
            overall: res.data.overall || 0,
            categories: res.data.categories || [],
          });
        }
      } catch (err) {
        console.error("Failed to load budget", err);
      }
    };
    loadBudget();
  }, [selectedMonth, selectedYear]);

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      await budgetService.setBudget({
        month: selectedMonth,
        year: selectedYear,
        overall: Number(budget.overall),
        categories: budget.categories.map((c) => ({
          category: c.category,
          limit: Number(c.limit),
        })),
      });
      toast.success("Budget saved successfully");
    } catch (err) {
      toast.error(err.message || "Failed to save budget");
    } finally {
      setSavingBudget(false);
    }
  };

  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.type === "expense"),
    [categories]
  );

  const dirty = profile.name !== user?.name || profile.currency !== user?.currency;
  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === categoryType),
    [categories, categoryType],
  );

  const submitCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;
    await addCategory({
      name: newCategory.name.trim(),
      icon: newCategory.icon,
      type: categoryType,
    });
    setNewCategory({ name: "", icon: "📌" });
  };

  return (
    <div className="mx-auto max-w-[700px] space-y-6">
      <Card
        header={<h2 className="font-display text-xl font-bold text-white">Profile</h2>}
      >
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 font-display text-xl font-extrabold text-slate-950">
            {user?.name?.slice(0, 2).toUpperCase() || "EF"}
          </div>
          <div>
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input
            label="Name"
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          />
          <label className="block">
            <span className="text-sm text-slate-500">Email</span>
            <input
              value={user?.email || ""}
              readOnly
              className="mt-2 w-full rounded-2xl border-white/10 bg-white/[0.03] text-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-500">Currency</span>
            <select
              value={profile.currency}
              onChange={(event) => setProfile({ ...profile, currency: event.target.value })}
              className="mt-2 w-full rounded-2xl border-white/10 bg-white/[0.04] text-white"
            >
              {["INR", "USD", "EUR", "GBP"].map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <Button disabled={!dirty} onClick={() => updateUser(profile)}>
            Save Profile
          </Button>
        </div>
      </Card>

      <Card
        header={<h2 className="font-display text-xl font-bold text-white">Custom Categories</h2>}
      >
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1">
          {["expense", "income"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCategoryType(type)}
              className={`rounded-xl py-2 text-sm font-bold capitalize ${
                categoryType === type
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredCategories.map((category) => (
            <div
              key={category._id}
              className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-3"
            >
              <span className="font-semibold text-white">
                {category.icon} {category.name}
              </span>
              <div className="flex items-center gap-2">
                {category.isDefault && (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">
                    Default
                  </span>
                )}
                {!category.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDeleting(category)}
                    className="rounded-xl p-2 text-red-300 hover:bg-red-400/10"
                    aria-label="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submitCategory} className="mt-4 grid grid-cols-[80px_1fr_auto] gap-2">
          <input
            value={newCategory.icon}
            onChange={(event) => setNewCategory({ ...newCategory, icon: event.target.value })}
            className="rounded-2xl border-white/10 bg-white/[0.04] text-center text-white"
            maxLength={4}
          />
          <input
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
            placeholder="Category name"
            className="rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-slate-600"
          />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">Monthly Budget</h2>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-500">Target Month & Year</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-white p-3 font-semibold focus:border-emerald-400 focus:ring-emerald-400"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {MONTH_NAMES[i]}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-2xl border-white/10 bg-white/[0.04] text-white p-3 font-semibold focus:border-emerald-400 focus:ring-emerald-400"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <Input
            label="Overall Monthly Limit (₹)"
            type="number"
            value={budget.overall === 0 ? "" : budget.overall}
            onChange={(e) => setBudgetState({ ...budget, overall: e.target.value === "" ? 0 : Number(e.target.value) })}
            placeholder="No overall limit"
          />

          <div className="space-y-3 mt-5">
            <p className="text-sm font-semibold text-slate-400">Category Specific Limits</p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {expenseCategories.map((cat) => {
                const catBudget = budget.categories.find((c) => c.category === cat.name) || { limit: "" };
                return (
                  <div key={cat.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.02] px-4 py-3 border border-white/[0.03]">
                    <span className="text-sm font-semibold text-slate-300">
                      {cat.icon || "📌"} {cat.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">₹</span>
                      <input
                        type="number"
                        value={catBudget.limit === undefined || catBudget.limit === "" ? "" : catBudget.limit}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          const val = valStr === "" ? "" : Number(valStr);
                          const exists = budget.categories.some((c) => c.category === cat.name);
                          let nextCats;
                          if (exists) {
                            nextCats = budget.categories.map((c) =>
                              c.category === cat.name ? { ...c, limit: val } : c
                            );
                          } else {
                            nextCats = [...budget.categories, { category: cat.name, limit: val }];
                          }
                          setBudgetState({ ...budget, categories: nextCats });
                        }}
                        className="w-28 rounded-xl border-white/10 bg-white/[0.04] text-white py-1 px-3.5 text-right font-mono focus:border-emerald-400 focus:ring-emerald-400"
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={handleSaveBudget} loading={savingBudget} className="mt-2 w-full">
            Save Budget Limits
          </Button>
        </div>
      </Card>

      <Card
        header={<h2 className="font-display text-xl font-bold text-white">Preferences</h2>}
      >
        <div className="space-y-3">
          {[
            ["showDecimals", "Show decimals"],
            ["groupByDate", "Group by date"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-slate-300">{label}</span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) => updatePreference(key, event.target.checked)}
                className="rounded border-white/10 bg-white/[0.04] text-emerald-400 focus:ring-emerald-400"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-sm text-slate-500">Default type</span>
            <select
              value={preferences.defaultType}
              onChange={(event) => updatePreference("defaultType", event.target.value)}
              className="mt-2 w-full rounded-2xl border-white/10 bg-white/[0.04] text-white"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className="border-red-400/20 bg-red-400/[0.04]">
        <h2 className="font-display text-xl font-bold text-red-200">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-200/70">
          Delete Account is disabled until your backend exposes an account deletion endpoint.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setDangerOpen(true)}>
          Delete Account
        </Button>
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete category?"
        message={`Delete ${deleting?.name}? Default categories cannot be deleted.`}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteCategory(deleting._id);
          setDeleting(null);
        }}
      />

      <ConfirmDialog
        isOpen={dangerOpen}
        title="Delete account?"
        message='Type "DELETE" in the field behind this dialog before confirming. This UI is prepared, but the backend endpoint is not available yet.'
        confirmLabel="I understand"
        onCancel={() => {
          setDangerText("");
          setDangerOpen(false);
        }}
        onConfirm={() => {
          setDangerText("");
          setDangerOpen(false);
        }}
      />
      <input
        value={dangerText}
        onChange={(event) => setDangerText(event.target.value)}
        placeholder='Type "DELETE" for danger confirmation'
        className="w-full rounded-2xl border-red-400/20 bg-red-400/[0.04] text-red-100 placeholder:text-red-200/40"
      />
    </div>
  );
};

export default Settings;
