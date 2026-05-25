import { memo, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import Card from "../common/Card";
import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS, CHART_COLORS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { budgetService } from "../../services/budgetService";

const CategoryPieChart = memo(() => {
  const { summary } = useTransactions();
  const [activeIndex, setActiveIndex] = useState(null);
  const [budget, setBudget] = useState(null);

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
        value: limit > 0 ? limit : 0.0001, // placeholder to maintain radial alignment
        hasLimit: limit > 0,
      };
    });
  }, [data, budget]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card
      className="h-full"
      header={
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Spending by Category
          </h2>
          <p className="text-sm text-slate-500">Expense share this month (outer rings show budget limit if set)</p>
        </div>
      }
    >
      {data.length ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name) => {
                    if (name.includes("Limit")) {
                      return value > 0.01 ? formatCurrency(value) : "No limit set";
                    }
                    return formatCurrency(value);
                  }}
                  contentStyle={{
                    background: "#151823",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                  }}
                />
                
                {/* Main Spending Pie */}
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={86}
                  paddingAngle={3}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke="transparent"
                      style={{
                        transform:
                          activeIndex === index ? "scale(1.04)" : "scale(1)",
                        transformOrigin: "center",
                        transition: "transform 180ms ease",
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
                    innerRadius={92}
                    outerRadius={96}
                    paddingAngle={3}
                  >
                    {ringData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.hasLimit ? CHART_COLORS[index % CHART_COLORS.length] : "transparent"}
                        stroke="transparent"
                        opacity={0.35}
                      />
                    ))}
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="amount text-lg font-bold text-white">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = total ? Math.round((item.value / total) * 100) : 0;
              const catBudget = budget?.categories?.find((c) => c.category === item.name);
              const limitStr = catBudget && catBudget.limit > 0 ? ` / Limit: ₹${catBudget.limit}` : "";

              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_EMOJIS[item.name] || "📌"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-semibold text-white">{item.name}</span>
                      <span className="text-slate-400">{percentage}%</span>
                    </div>
                    <p className="amount text-sm text-slate-500">
                      {formatCurrency(item.value)}
                      <span className="text-xs text-slate-600 block sm:inline font-mono">{limitStr}</span>
                    </p>
                  </div>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-slate-500">
          No category data yet
        </div>
      )}
    </Card>
  );
});

CategoryPieChart.displayName = "CategoryPieChart";

export default CategoryPieChart;
