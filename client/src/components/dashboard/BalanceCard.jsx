import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";

import Card from "../common/Card";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { formatCurrency } from "../../utils/formatCurrency";
import { budgetService } from "../../services/budgetService";

const icons = {
  income: ArrowUp,
  expense: ArrowDown,
  balance: Wallet,
};

const colors = {
  income: "border-l-emerald-400 text-emerald-300",
  expense: "border-l-red-400 text-red-300",
  balance: "border-l-violet-400 text-violet-300",
};

const BalanceCard = ({ type, label, amount }) => {
  const Icon = icons[type];
  const animated = useAnimatedNumber(amount);
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    if (type === "expense") {
      budgetService
        .getBudgetStatus()
        .then((res) => {
          if (res.data?.overall) {
            setBudget(res.data.overall);
          }
        })
        .catch((err) => console.error("Failed to load budget status in BalanceCard", err));
    }
  }, [type]);

  const pct = budget && budget.limit > 0 ? budget.percentage : 0;
  const barColor = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <Card className={`border-l-4 ${colors[type]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="amount mt-3 text-3xl font-bold text-white sm:text-4xl">
            {formatCurrency(animated)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-3">
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {type === "expense" && budget && budget.limit > 0 && (
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-semibold">
            <span>Budget: {formatCurrency(budget.limit)}</span>
            <span>{pct}% used</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default BalanceCard;
