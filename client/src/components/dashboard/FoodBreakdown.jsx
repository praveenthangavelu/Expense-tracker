import { useTransactions } from "../../context/TransactionContext";
import Card from "../common/Card";
import { formatCurrency } from "../../utils/formatCurrency";

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

export const FoodBreakdown = () => {
  const { summary } = useTransactions();
  const foodBreakdown = summary?.foodBreakdown || [];

  if (foodBreakdown.length === 0) return null;

  const grandTotal = foodBreakdown.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <div className="relative flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--mint-soft)] text-[var(--mint)]">
            <span className="text-sm">🍔</span>
          </div>
          <h2 className="font-sans text-base font-bold text-[var(--text-primary)]">
            Where does your food money go?
          </h2>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 mt-3">
        {foodBreakdown.map((item) => {
          const name = item._id || "Other Food";
          const icon = subCategoryIcons[name] || "🍽️";
          const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;

          return (
            <div key={name} className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)]">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="text-base select-none">{icon}</span>
                  <span className="truncate">{name}</span>
                </span>
                <span className="amount text-[var(--mint)] font-mono flex items-center gap-1.5">
                  {formatCurrency(item.total)}
                  <span className="text-[10px] text-[var(--text-secondary)] font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--progress-track)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--progress-mint)] shadow-[var(--shadow-glow-mint)] transition-all duration-[0.8s] ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default FoodBreakdown;
