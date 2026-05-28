import React, { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarRange, CalendarDays, Target, Repeat, ShieldCheck, Layers } from "lucide-react";
import TabNav from "../components/common/TabNav";
import Loader from "../components/common/Loader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import monthlyPlanService from "../services/monthlyPlanService";
import { budgetService } from "../services/budgetService";
import { useTransactions } from "../context/TransactionContext";
import { MONTH_NAMES } from "../utils/constants";
import toast from "react-hot-toast";

// Lazy load actual page components
const MonthlyPlanner = lazy(() => import("./MonthlyPlanner"));
const AnnualPlanner = lazy(() => import("./AnnualPlanner"));
const Goals = lazy(() => import("./Goals"));
const Recurring = lazy(() => import("./Recurring"));

// Rules tab sub-component
const RulesTab = () => {
  const now = new Date();
  const { categories } = useTransactions();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Budget states
  const [budget, setBudgetState] = useState({ overall: 0, categories: [] });
  const [savingBudget, setSavingBudget] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((cat) => cat.type === "expense"),
    [categories]
  );

  const loadRulesAndBudgets = async (m, y) => {
    setLoading(true);
    try {
      const [res, budgetRes] = await Promise.all([
        monthlyPlanService.getPlan({ month: m, year: y, autoCreate: true }),
        budgetService.getBudget({ month: m, year: y }),
      ]);

      if (res.success) {
        setPlan(res.data.plan);
      }
      if (budgetRes?.data) {
        setBudgetState({
          overall: budgetRes.data.overall || 0,
          categories: budgetRes.data.categories || [],
        });
      }
    } catch (err) {
      console.error("Failed to load budgets and rules", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRulesAndBudgets(month, year);
    }, 0);
    return () => clearTimeout(timer);
  }, [month, year]);

  const handleToggleRule = async (ruleIdx) => {
    if (!plan) return;
    const rule = plan.rules[ruleIdx];
    try {
      await monthlyPlanService.addRule(
        { type: rule.type, config: rule.config, isActive: !rule.isActive },
        { month, year }
      );
      toast.success(`Rule '${rule.type}' updated`);
      loadRulesAndBudgets(month, year);
    } catch {
      toast.error("Failed to update rule settings");
    }
  };

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      await budgetService.setBudget({
        month,
        year,
        overall: Number(budget.overall),
        categories: budget.categories.map((c) => ({
          category: c.category,
          limit: Number(c.limit),
        })),
      });
      toast.success("Budget limits saved successfully");
      loadRulesAndBudgets(month, year);
    } catch (err) {
      toast.error(err.message || "Failed to save budget");
    } finally {
      setSavingBudget(false);
    }
  };

  if (loading) return <Loader label="Loading active rules & limits..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h3 className="font-headline text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--mint)]" />
            Budget Rules & Category Limits
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage spending limits, rules, and category-specific monthly caps.
          </p>
        </div>

        {/* Date Selector */}
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-white py-2 px-3 focus:border-[var(--border-focus)] focus:outline-none cursor-pointer font-semibold"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1} className="bg-[var(--bg-surface)]">
              {name} {year}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Active Rules */}
        <div className="lg:col-span-6 space-y-4">
          <Card header="Active Rules & Budget Limits" className="p-6">
            {plan?.rules && plan.rules.length > 0 ? (
              <div className="space-y-4">
                {plan.rules.map((rule, idx) => {
                  let desc = "";
                  if (rule.type === "daily_limit") desc = `Cap spending at ₹${rule.config?.limit}/day. Warnings fire on overage.`;
                  if (rule.type === "weekly_limit") desc = `Cap spending at ₹${rule.config?.limit}/week. Warnings fire on overage.`;
                  if (rule.type === "category_cap") desc = `Limit ${rule.config?.category} to ₹${rule.config?.limit} per week.`;
                  if (rule.type === "no_spend_day") desc = `Designate ${rule.config?.day}s as zero spending. Alerts trigger if violated.`;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white capitalize">
                          {rule.type.replace("_", " ")}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRule(idx)}
                        className="cursor-pointer outline-none"
                      >
                        {rule.isActive ? (
                          <span className="rounded-full bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.2)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--bg-hover)] text-[var(--text-dim)] border border-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                            Paused
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
                No active budget rules configured for this month.
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Category Specific Limits Editor */}
        <div className="lg:col-span-6 space-y-4">
          <Card header="Monthly Budgets & Caps" className="p-6">
            <div className="space-y-4">
              <Input
                label="Overall Monthly Limit (₹)"
                type="number"
                value={budget.overall === 0 ? "" : budget.overall}
                onChange={(e) => setBudgetState({ ...budget, overall: e.target.value === "" ? 0 : Number(e.target.value) })}
                placeholder="No overall limit"
              />

              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] animate-in">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Category Specific Limits</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                  {expenseCategories.map((cat) => {
                    const catBudget = budget.categories.find((c) => c.category === cat.name) || { limit: "" };
                    return (
                      <div key={cat.name} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-base)] px-4 py-2.5 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {cat.icon || "📌"} {cat.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-dim)] font-semibold text-xs">₹</span>
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
                            className="w-28 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-white py-1 px-3 text-right font-mono text-xs focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none"
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleSaveBudget} loading={savingBudget} variant="primary" className="mt-2 w-full h-11">
                Save Budget Limits
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const BudgetGoals = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const queryParams = new URLSearchParams(search);
  const activeTab = queryParams.get("tab") || "monthly";

  // Persistent Tab mounting structure
  const [visitedTabs, setVisitedTabs] = useState(new Set([activeTab]));

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleTabChange = (key) => {
    navigate(`/budget-goals?tab=${key}`);
  };

  const tabs = [
    { key: "monthly", label: "Monthly Plan", icon: CalendarRange },
    { key: "annual", label: "Annual Plan", icon: CalendarDays },
    { key: "goals", label: "Goals", icon: Target },
    { key: "recurring", label: "Recurring", icon: Repeat },
    { key: "rules", label: "Rules", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal Premium tab Nav */}
      <TabNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      {/* Persistent Page Content panel renderer */}
      <div className="relative">
        <Suspense fallback={<Loader label="Loading tab content..." />}>
          {/* Monthly tab */}
          {visitedTabs.has("monthly") && (
            <div style={{ display: activeTab === "monthly" ? "block" : "none" }}>
              <MonthlyPlanner />
            </div>
          )}

          {/* Annual tab */}
          {visitedTabs.has("annual") && (
            <div style={{ display: activeTab === "annual" ? "block" : "none" }}>
              <AnnualPlanner />
            </div>
          )}

          {/* Goals tab */}
          {visitedTabs.has("goals") && (
            <div style={{ display: activeTab === "goals" ? "block" : "none" }}>
              <Goals />
            </div>
          )}

          {/* Recurring tab */}
          {visitedTabs.has("recurring") && (
            <div style={{ display: activeTab === "recurring" ? "block" : "none" }}>
              <Recurring />
            </div>
          )}

          {/* Rules tab */}
          {visitedTabs.has("rules") && (
            <div style={{ display: activeTab === "rules" ? "block" : "none" }}>
              <RulesTab />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default BudgetGoals;
