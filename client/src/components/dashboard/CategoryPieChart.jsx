import { memo, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle, Maximize2 } from "lucide-react";
import clsx from "clsx";


import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { budgetService } from "../../services/budgetService";
import { useChartTheme } from "../../hooks/useChartTheme";

const CategoryPieChart = memo(({ onExpand }) => {
  const { summary } = useTransactions();
  const [activeIndex, setActiveIndex] = useState(null);
  const [budget, setBudget] = useState(null);
  const chartTheme = useChartTheme();

  // Use dynamic colors from the theme
  const palette = chartTheme.colors;

  useEffect(() => {
    budgetService
      .getBudgetStatus()
      .then((res) => setBudget(res.data))
      .catch((err) => console.error("Failed to load budget status in CategoryPieChart", err));
  }, []);

  const data = useMemo(
    () =>
      (summary?.categoryBreakdown || []).map((item) => ({
        name: item._id,
        value: item.total,
        count: item.count,
      })),
    [summary],
  );

  const ringData = useMemo(() => {
    if (!budget || !budget.categories) return [];
    return data.map((item) => {
      const catBudget = budget.categories.find((c) => c.category === item.name);
      const limit = catBudget ? catBudget.limit : 0;
      return {
        name: `${item.name} Limit`,
        value: limit > 0 ? limit : 0.0001,
        hasLimit: limit > 0,
      };
    });
  }, [data, budget]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full justify-between select-none">
      {/* Header controls inside component */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Spending Breakdown
          </h3>
          <p className="text-[10px] text-[var(--text-secondary)] font-medium">Expense share this month</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--electric-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--electric)] uppercase tracking-wide">
            This Month
          </span>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand spending breakdown chart"
              className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors outline-none"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {data.length ? (
        <div className="grid gap-6 mt-4 lg:grid-cols-[1fr_1.2fr] items-center">
          {/* Donut Chart Container */}
          <div className="relative h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name) => {
                    if (name && name.includes("Limit")) {
                      return value > 0.01 ? formatCurrency(value) : "No limit set";
                    }
                    return formatCurrency(value);
                  }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                
                {/* Main Donut Pie */}
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={3}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={palette[index % palette.length]}
                      stroke="var(--bg-surface)"
                      strokeWidth={3}
                      style={{
                        transform: activeIndex === index ? "scale(1.03)" : "scale(1)",
                        transformOrigin: "center",
                        transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                        opacity: activeIndex !== null && activeIndex !== index ? 0.45 : 0.95,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Pie>

                {/* Outer Budget Ring */}
                {ringData.length > 0 && (
                  <Pie
                    data={ringData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={98}
                    outerRadius={102}
                    paddingAngle={3}
                  >
                    {ringData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.hasLimit ? palette[index % palette.length] : "transparent"}
                        stroke="transparent"
                        opacity={0.3}
                      />
                    ))}
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text Info */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Total</span>
              <span className="amount mt-1 text-xl font-bold text-[var(--text-primary)] font-mono">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Legend Section */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {data.map((item, index) => {
              const percentage = total ? Math.round((item.value / total) * 100) : 0;
              const catColor = palette[index % palette.length];
              const isHovered = activeIndex === index;

              return (
                <div 
                  key={item.name} 
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={clsx(
                    "flex items-center justify-between gap-3 rounded-lg p-2 transition-all duration-200 border border-transparent",
                    isHovered && "bg-[var(--bg-hover)] border-[var(--border-subtle)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="text-xl flex-shrink-0">{CATEGORY_EMOJIS[item.name] || "📌"}</span>
                    <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <span className="amount text-xs font-medium text-[var(--text-primary)] font-mono">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-dim)] w-8">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-secondary)] gap-3 py-10">
          <AlertCircle className="h-10 w-10 text-[var(--text-dim)]" />
          <p className="text-sm font-medium">No category data yet</p>
        </div>
      )}
    </div>
  );
});

CategoryPieChart.displayName = "CategoryPieChart";

export default CategoryPieChart;
