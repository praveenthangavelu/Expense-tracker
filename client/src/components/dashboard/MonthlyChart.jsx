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
import { AlertCircle, Maximize2 } from "lucide-react";


import { useTransactions } from "../../context/TransactionContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { MONTH_NAMES } from "../../utils/constants";
import { useChartTheme } from "../../hooks/useChartTheme";

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const income = payload.find((x) => x.dataKey === "Income")?.value || 0;
  const expense = payload.find((x) => x.dataKey === "Expense")?.value || 0;
  const net = income - expense;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)]">
      <p className="mb-2 font-bold text-[var(--text-primary)] text-xs tracking-wide uppercase">{label}</p>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-[var(--mint)] flex items-center justify-between gap-6">
          <span>Income:</span>
          <span className="font-mono">{formatCurrency(income)}</span>
        </p>
        <p className="text-xs font-semibold text-[var(--flame)] flex items-center justify-between gap-6">
          <span>Expense:</span>
          <span className="font-mono">{formatCurrency(expense)}</span>
        </p>
        <div className="h-[1px] bg-[var(--border-subtle)] my-1" />
        <p className={`text-xs font-bold flex items-center justify-between gap-6 ${net >= 0 ? "text-[var(--mint)]" : "text-[var(--flame)]"}`}>
          <span>Net:</span>
          <span className="font-mono">{formatCurrency(net)}</span>
        </p>
      </div>
    </div>
  );
};

const MonthlyChart = memo(({ onExpand }) => {
  const { summary, fetchSummary } = useTransactions();
  const [year, setYear] = useState(new Date().getFullYear());
  const chartTheme = useChartTheme();

  const data = useMemo(() => {
    const rows = MONTH_NAMES.map((month) => ({ month: month.substring(0, 3), Income: 0, Expense: 0 }));

    summary?.monthlySummary?.forEach((item) => {
      const monthNum = item._id?.month;
      if (monthNum && monthNum >= 1 && monthNum <= 12) {
        const index = monthNum - 1;
        const key = item._id?.type === "income" ? "Income" : "Expense";
        if (rows[index]) {
          rows[index][key] = item.total;
        }
      }
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
    <div className="flex flex-col flex-1 min-h-0 w-full justify-between select-none">
      {/* Header controls inside component */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Monthly Overview
          </h3>
          <p className="text-[10px] text-[var(--text-secondary)] font-medium">Income vs expense by month</p>
        </div>
        <div className="flex items-center gap-2">
          <select
             value={year}
            onChange={handleYearChange}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-hover)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none cursor-pointer font-semibold"
          >
            {[0, 1, 2].map((offset) => {
              const option = new Date().getFullYear() - offset;
              return (
                <option key={option} value={option} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {option}
                </option>
              );
            })}
          </select>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand monthly overview chart"
              className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors outline-none"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {hasData ? (
        <div className="relative flex-1 min-h-[250px] lg:min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid stroke={chartTheme.gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke={chartTheme.textColor} 
                tickLine={false} 
                axisLine={false} 
                style={{ fontSize: "11px", fontFamily: "var(--font-body)" }}
              />
              <YAxis 
                stroke={chartTheme.textColor} 
                tickLine={false} 
                axisLine={false} 
                width={65} 
                style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(1).replace(/\.0$/, "")}k` : val}`}
              />
              <Tooltip cursor={{ fill: chartTheme.gridColor, opacity: 0.2 }} content={<TooltipContent />} />
              <Bar 
                dataKey="Income" 
                fill={chartTheme.incomeColor} 
                opacity={0.8}
                radius={[6, 6, 0, 0]} 
                animationDuration={1500}
              />
              <Bar 
                dataKey="Expense" 
                fill={chartTheme.expenseColor} 
                opacity={0.8}
                radius={[6, 6, 0, 0]} 
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-secondary)] gap-3 py-10">
          <AlertCircle className="h-10 w-10 text-[var(--text-dim)]" />
          <p className="text-sm font-medium">Add your first transaction to see trends</p>
        </div>
      )}
    </div>
  );
});

MonthlyChart.displayName = "MonthlyChart";

export default MonthlyChart;
