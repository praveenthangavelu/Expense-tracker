import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { Download } from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { transactionService } from "../services/transactionService";
import { CATEGORY_EMOJIS } from "../utils/constants";
import { exportCSV } from "../utils/exportCSV";
import { formatCurrency } from "../utils/formatCurrency";

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

  const trend = useMemo(() => {
    const rows = {};
    transactions.forEach((item) => {
      const day = format(new Date(item.date), "d MMM");
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

    return allSubs.map((sub) => {
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
    }).sort((a, b) => b.current - a.current);
  }, [transactions, lastMonthTransactions]);

  const biggest = [...transactions]
    .filter((item) => item.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Reports</h2>
          <p className="text-slate-500">Monthly trends and category intelligence.</p>
        </div>
        <Button variant="outline" onClick={() => exportCSV(transactions)}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {monthOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setSelected(option)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              selected.label === option.label
                ? "bg-emerald-400 text-slate-950"
                : "bg-white/[0.04] text-slate-400 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Income", stats.income, "text-emerald-300"],
          ["Expenses", stats.expenses, "text-red-300"],
          ["Savings", stats.savings, stats.savings >= 0 ? "text-emerald-300" : "text-red-300"],
          ["Count", stats.count, "text-violet-300"],
        ].map(([label, value, color]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`amount mt-2 text-3xl font-bold ${color}`}>
              {label === "Count" ? value : formatCurrency(value)}
            </p>
            <p className="mt-3 text-xs text-emerald-300">↑ Live from selected month</p>
          </Card>
        ))}
      </div>

      <Card
        header={
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Income vs Expense Trend
            </h3>
            <p className="text-sm text-slate-500">Daily movement inside the month</p>
          </div>
        }
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="#8B8FA3" tickLine={false} axisLine={false} />
              <YAxis stroke="#8B8FA3" tickLine={false} axisLine={false} width={80} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  background: "#151823",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                }}
              />
              <Area type="monotone" dataKey="Income" stroke="#10B981" fill="url(#incomeFill)" />
              <Area type="monotone" dataKey="Expense" stroke="#EF4444" fill="url(#expenseFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card
          header={<h3 className="font-display text-xl font-bold text-white">Category Breakdown</h3>}
        >
          <div className="space-y-2">
            {categories.map((category) => {
              const percentage = stats.expenses
                ? Math.round((category.amount / stats.expenses) * 100)
                : 0;
              return (
                <div key={category.name} className="rounded-2xl p-3 odd:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {CATEGORY_EMOJIS[category.name] || "📌"} {category.name}
                    </p>
                    <p className="amount text-slate-300">{formatCurrency(category.amount)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          header={<h3 className="font-display text-xl font-bold text-white">Top 5 Expenses</h3>}
        >
          <div className="space-y-2">
            {biggest.map((item, index) => (
              <div
                key={item._id}
                className={`flex items-center justify-between rounded-2xl p-3 ${
                  index === 0 ? "bg-yellow-400/10 text-yellow-200" : "bg-white/[0.03]"
                }`}
              >
                <span className="font-semibold">
                  #{index + 1} {item.category}
                </span>
                <span className="amount font-bold">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Food Subcategory Breakdown Section */}
      <Card
        header={
          <div>
            <h3 className="font-display text-xl font-bold text-white">Food Breakdown</h3>
            <p className="text-sm text-slate-500">Monthly sub-category comparisons</p>
          </div>
        }
      >
        {foodComparison.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No Food expenses recorded this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase text-slate-500 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Sub-Category</th>
                  <th className="py-3 px-4 text-right">This Month</th>
                  <th className="py-3 px-4 text-right">Last Month</th>
                  <th className="py-3 px-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {foodComparison.map((item) => {
                  const name = item.subCategory;
                  const icon = subCategoryIcons[name] || "🍽️";
                  const changeColor = item.change > 0 ? "text-red-400" : item.change < 0 ? "text-emerald-400" : "text-slate-400";
                  const changeText = item.change > 0 
                    ? `+${formatCurrency(item.change)} (+${item.pct}%)`
                    : item.change < 0
                    ? `-${formatCurrency(Math.abs(item.change))} (${item.pct}%)`
                    : "0";
                  return (
                    <tr key={name} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span>{name}</span>
                      </td>
                      <td className="py-3 px-4 text-right amount font-semibold">{formatCurrency(item.current)}</td>
                      <td className="py-3 px-4 text-right amount text-slate-500">{formatCurrency(item.previous)}</td>
                      <td className={`py-3 px-4 text-right amount font-bold ${changeColor}`}>{changeText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;
