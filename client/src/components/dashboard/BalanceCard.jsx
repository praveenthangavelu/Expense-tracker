import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

import Card from "../common/Card";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { formatCurrency } from "../../utils/formatCurrency";
import { budgetService } from "../../services/budgetService";

const icons = {
  income: TrendingUp,
  expense: TrendingDown,
  balance: Wallet,
};

const cardVariants = {
  income: "glow-mint",
  expense: "glow-flame",
  balance: "glow-electric",
};

const textColors = {
  income: "text-[var(--mint)]",
  expense: "text-[var(--flame)]",
  balance: "text-[var(--mint)]", // defaults to mint if positive
};

const BalanceCard = ({ type, label, amount }) => {
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
  const barColor = pct >= 90 ? "bg-[var(--flame)]" : pct >= 70 ? "bg-[var(--solar)]" : "bg-[var(--mint)]";

  // Balance status icon & color based on value
  const isNegative = type === "balance" && amount < 0;
  const Icon = isNegative ? AlertTriangle : icons[type];
  const amountColor = isNegative 
    ? "text-[var(--flame)]" 
    : type === "income" 
    ? "text-[var(--mint)]" 
    : type === "expense" 
    ? "text-[var(--flame)]" 
    : "text-[var(--mint)]";

  const iconWrapperClass = isNegative
    ? "bg-[var(--flame-soft)] text-[var(--flame)]"
    : type === "income"
    ? "bg-[var(--mint-soft)] text-[var(--mint)]"
    : type === "expense"
    ? "bg-[var(--flame-soft)] text-[var(--flame)]"
    : "bg-[var(--electric-soft)] text-[var(--electric)]";

  const subText = 
    type === "income" 
      ? "↑ 12% from last month" 
      : type === "expense" 
      ? "↓ 4% from last month" 
      : isNegative 
      ? "Negative balance" 
      : "Healthy balance";

  const subTextColor = 
    type === "income" || (type === "balance" && !isNegative)
      ? "text-[var(--mint)]"
      : "text-[var(--flame)]";

  return (
    <Card variant={cardVariants[type]} className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--text-dim)] uppercase">
              {label}
            </p>
            <h2 className={`amount mt-3 text-3xl font-medium tracking-tight sm:text-4xl ${amountColor} font-mono`}>
              {formatCurrency(animated)}
            </h2>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full p-2.5 transition-colors ${iconWrapperClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Budget Bar for Expense Card */}
        {type === "expense" && budget && budget.limit > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] font-semibold">
              <span>Limit: {formatCurrency(budget.limit)}</span>
              <span>{pct}% used</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[var(--text-ghost)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-[1s] ease-out ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center">
        <span className={`text-[11px] font-bold tracking-wide ${subTextColor}`}>
          {subText}
        </span>
      </div>
    </Card>
  );
};

export default BalanceCard;
