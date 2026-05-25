import { memo, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../common/Card";
import { useTransactions } from "../../context/TransactionContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { MONTH_NAMES } from "../../utils/constants";

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151823]/95 p-3 shadow-2xl">
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

const MonthlyChart = memo(() => {
  const { summary, fetchSummary } = useTransactions();
  const [year, setYear] = useState(new Date().getFullYear());

  const data = useMemo(() => {
    const rows = MONTH_NAMES.map((month) => ({ month, Income: 0, Expense: 0 }));

    summary?.monthlySummary?.forEach((item) => {
      const index = item._id.month - 1;
      const key = item._id.type === "income" ? "Income" : "Expense";
      rows[index][key] = item.total;
    });

    return rows;
  }, [summary]);

  const hasData = data.some((item) => item.Income || item.Expense);

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setYear(nextYear);
    fetchSummary(new Date().getMonth() + 1, nextYear);
  };

  return (
    <Card
      className="h-full"
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Monthly Overview
            </h2>
            <p className="text-sm text-slate-500">Income vs expense by month</p>
          </div>
          <select
            value={year}
            onChange={handleYearChange}
            className="rounded-xl border-white/10 bg-white/[0.04] text-sm text-white focus:border-emerald-400 focus:ring-emerald-400"
          >
            {[0, 1, 2].map((offset) => {
              const option = new Date().getFullYear() - offset;
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            })}
          </select>
        </div>
      }
    >
      {hasData ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="#8B8FA3" tickLine={false} axisLine={false} />
              <YAxis stroke="#8B8FA3" tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<TooltipContent />} />
              <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center text-slate-500">
          No monthly data yet
        </div>
      )}
    </Card>
  );
});

MonthlyChart.displayName = "MonthlyChart";

export default MonthlyChart;
