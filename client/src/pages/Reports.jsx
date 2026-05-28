import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { transactionService } from "../services/transactionService";
import { exportCSV } from "../utils/exportCSV";
import { formatCurrency } from "../utils/formatCurrency";

// Import modular components
import StatsGrid from "../components/insights/StatsGrid";
import DailyTrendChart from "../components/insights/DailyTrendChart";
import CategoryTable from "../components/insights/CategoryTable";
import TopExpenses from "../components/insights/TopExpenses";

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

const monthOptions = Array.from({ length: 6 }).map((_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - index);
  return {
    label: format(date, "MMM yyyy"),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
});

const subCategoryIcons = {
  "Home Cooked": "🏠",
  "Restaurant / Dine-in": "🍽️",
  "Street Food": "🛒",
  "Fast Food": "🍟",
  "Cafe / Coffee": "☕",
  "Sweets / Desserts": "🍰",
  "Groceries": "🥬",
  "Online Food Delivery": "📱",
  "Snacks / Packaged": "🍪",
  "Beverages": "🧃",
  "Fruits": "🍎",
  "Non-Veg / Meat": "🍗",
  "Tiffin / Mess": "🍱",
  "Other Food": "🍔",
  "Uncategorized": "🍔",
};

const Reports = () => {
  const [selected, setSelected] = useState(monthOptions[0]);
  const [transactions, setTransactions] = useState([]);
  const [lastMonthTransactions, setLastMonthTransactions] = useState([]);

  useEffect(() => {
    transactionService
      .getAllForMonth(selected.month, selected.year)
      .then((response) => setTransactions(response.data || []));

    const prevMonth = selected.month === 1 ? 12 : selected.month - 1;
    const prevYear = selected.month === 1 ? selected.year - 1 : selected.year;
    transactionService
      .getAllForMonth(prevMonth, prevYear)
      .then((response) => setLastMonthTransactions(response.data || []));
  }, [selected]);

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

  const foodComparison = useMemo(() => {
    const thisMonthSub = {};
    transactions
      .filter((item) => item.type === "expense" && item.category === "Food")
      .forEach((item) => {
        const sub = item.subCategory || "Other Food";
        thisMonthSub[sub] = (thisMonthSub[sub] || 0) + item.amount;
      });

    const lastMonthSub = {};
    lastMonthTransactions
      .filter((item) => item.type === "expense" && item.category === "Food")
      .forEach((item) => {
        const sub = item.subCategory || "Other Food";
        lastMonthSub[sub] = (lastMonthSub[sub] || 0) + item.amount;
      });

    const allSubs = Array.from(new Set([...Object.keys(thisMonthSub), ...Object.keys(lastMonthSub)]));

    return allSubs
      .map((sub) => {
        const current = thisMonthSub[sub] || 0;
        const previous = lastMonthSub[sub] || 0;
        const change = current - previous;
        const pct = previous > 0 ? Math.round((change / previous) * 100) : 0;
        return {
          subCategory: sub,
          current,
          previous,
          change,
          pct,
        };
      })
      .sort((a, b) => b.current - a.current);
  }, [transactions, lastMonthTransactions]);

  const biggest = useMemo(() => {
    return [...transactions]
      .filter((item) => item.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className="space-y-6"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">Reports</h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium">
            Monthly trends and category intelligence.
          </p>
        </div>
        <Button variant="glass" onClick={() => exportCSV(transactions)} className="h-11">
          <Download className="h-4 w-4 mr-1 shrink-0" />
          Export CSV
        </Button>
      </div>

      {/* MONTH SELECTOR */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory border-b border-[var(--border-subtle)]">
        {monthOptions.map((option) => {
          const isSelected = selected.label === option.label;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => setSelected(option)}
              className={clsx(
                "relative rounded-xl px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors shrink-0 snap-start cursor-pointer h-[42px] flex items-center justify-center min-w-[100px]",
                isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-white"
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="report-month-indicator"
                  className="absolute inset-0 rounded-xl bg-[var(--electric-soft)] border border-[rgba(124,111,255,0.3)] shadow-[var(--shadow-glow-electric)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={stats} changeBadges={changeBadges} />

      {/* Daily trend area chart */}
      <DailyTrendChart trend={trend} />

      {/* Grid of Categories and Top Expenses */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CategoryTable categories={categories} totalExpenses={stats.expenses} />
        <TopExpenses biggest={biggest} />
      </div>

      {/* FOOD SUBCATEGORY DETAIL CHART / TABLE */}
      <Card
        header={
          <div>
            <h3 className="font-display text-base font-bold text-white">Food Breakdown</h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
              Food sub-category itemized monthly comparison
            </p>
          </div>
        }
      >
        {foodComparison.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] font-medium py-8 text-center">
            No Food expenses recorded this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase tracking-wider font-bold">
                  <th className="pb-3 px-4">Sub-Category</th>
                  <th className="pb-3 px-4 text-right">This Month</th>
                  <th className="pb-3 px-4 text-right">Last Month</th>
                  <th className="pb-3 px-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {foodComparison.map((item) => {
                  const name = item.subCategory;
                  const icon = subCategoryIcons[name] || "🍽️";
                  const changeColor =
                    item.change > 0
                      ? "text-[var(--flame)]"
                      : item.change < 0
                      ? "text-[var(--mint)]"
                      : "text-[var(--text-secondary)]";

                  const changeText =
                    item.change > 0
                      ? `+${formatCurrency(item.change)} (+${item.pct}%)`
                      : item.change < 0
                      ? `-${formatCurrency(Math.abs(item.change))} (${item.pct}%)`
                      : "0";

                  return (
                    <tr
                      key={name}
                      className="hover:bg-[var(--bg-hover)] transition-all duration-200"
                    >
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="text-base select-none">{icon}</span>
                        <span>{name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--text-primary)]">
                        {formatCurrency(item.current)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--text-dim)]">
                        {formatCurrency(item.previous)}
                      </td>
                      <td className={clsx("py-3 px-4 text-right font-mono font-bold", changeColor)}>
                        {changeText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default Reports;
