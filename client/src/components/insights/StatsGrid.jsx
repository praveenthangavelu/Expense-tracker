import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";
import Card from "../common/Card";
import { formatCurrency } from "../../utils/formatCurrency";

export const StatsGrid = ({ stats = {}, changeBadges = {} }) => {
  const { income = 0, expenses = 0, savings = 0, count = 0 } = stats;

  const defaultBadge = { text: "No history", isIncrease: null };
  const badges = {
    income: changeBadges.income || defaultBadge,
    expenses: changeBadges.expenses || defaultBadge,
    savings: changeBadges.savings || defaultBadge,
    count: changeBadges.count || defaultBadge,
  };

  const cardsData = [
    {
      label: "Income",
      value: income,
      badge: badges.income,
      variant: "glow-mint",
      colorClass: "text-[var(--mint)]",
    },
    {
      label: "Expenses",
      value: expenses,
      badge: badges.expenses,
      variant: "glow-flame",
      colorClass: "text-[var(--flame)]",
    },
    {
      label: "Savings",
      value: savings,
      badge: badges.savings,
      variant: savings >= 0 ? "glow-mint" : "glow-flame",
      colorClass: savings >= 0 ? "text-[var(--mint)]" : "text-[var(--flame)]",
    },
    {
      label: "Transactions",
      value: count,
      badge: badges.count,
      variant: "glow-electric",
      colorClass: "text-[var(--electric)]",
      isCount: true,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cardsData.map((card) => (
        <Card
          key={card.label}
          variant={card.variant}
          className="p-5 flex flex-col justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">
              {card.label}
            </p>
            <p
              className={clsx(
                "font-mono mt-2.5 text-2xl font-bold tracking-tight",
                card.colorClass
              )}
            >
              {card.isCount ? card.value : formatCurrency(card.value)}
            </p>
          </div>
          {card.badge.isIncrease !== null && (
            <div className="mt-4">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                  card.badge.isIncrease
                    ? "bg-[var(--mint-soft)] text-[var(--mint)] border-[rgba(99,228,181,0.2)]"
                    : "bg-[var(--flame-soft)] text-[var(--flame)] border-[rgba(255,107,107,0.2)]"
                )}
              >
                {card.badge.isIncrease ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{card.badge.text} MoM</span>
              </span>
            </div>
          )}
          {card.badge.isIncrease === null && (
            <p className="mt-4 text-[10px] font-semibold text-[var(--text-ghost)]">
              No prior data
            </p>
          )}
        </Card>
      ))}
    </div>
  );
};

export default StatsGrid;
