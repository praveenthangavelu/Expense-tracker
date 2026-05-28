import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../common/Card";
import { formatCurrency } from "../../utils/formatCurrency";
import { useChartTheme } from "../../hooks/useChartTheme";

export const DailyTrendChart = ({ trend = [] }) => {
  const chartTheme = useChartTheme();

  return (
    <Card
      header={
        <div>
          <h3 className="font-display text-base font-bold text-[var(--text-primary)]">Daily Trend</h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Daily income and expense pattern
          </p>
        </div>
      }
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.incomeColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartTheme.incomeColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.expenseColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartTheme.expenseColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.gridColor} vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              stroke={chartTheme.textColor}
              tickLine={false}
              axisLine={false}
              style={{ fontSize: "10px", fontFamily: "var(--general-sans)" }}
            />
            <YAxis
              stroke={chartTheme.textColor}
              tickLine={false}
              axisLine={false}
              width={80}
              style={{ fontSize: "10px", fontFamily: "var(--geist-mono)" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-md)]">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{data.day}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-[var(--mint)] flex justify-between gap-4">
                          <span>Income:</span>
                          <span className="font-mono">{formatCurrency(data.Income)}</span>
                        </p>
                        <p className="text-xs font-semibold text-[var(--flame)] flex justify-between gap-4">
                          <span>Expense:</span>
                          <span className="font-mono">{formatCurrency(data.Expense)}</span>
                        </p>
                        <p className="text-xs font-bold border-t border-[var(--border-subtle)] pt-1 mt-1 text-[var(--text-primary)] flex justify-between gap-4">
                          <span>Net:</span>
                          <span className="font-mono">
                            {formatCurrency(data.Income - data.Expense)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="Income"
              stroke={chartTheme.incomeColor}
              strokeWidth={2}
              fill="url(#incomeFill)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="Expense"
              stroke={chartTheme.expenseColor}
              strokeWidth={2}
              fill="url(#expenseFill)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default DailyTrendChart;
