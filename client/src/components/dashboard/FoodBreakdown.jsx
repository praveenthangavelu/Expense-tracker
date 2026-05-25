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
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <span>Where does your food money go?</span>
          <span>🍔</span>
        </h2>
      }
    >
      <div className="space-y-4">
        {foodBreakdown.map((item) => {
          const name = item._id || "Other Food";
          const icon = subCategoryIcons[name] || "🍽️";
          const pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;

          return (
            <div key={name} className="space-y-1.5">
              <div className="flex justify-between text-xs sm:text-sm font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="truncate">{name}</span>
                </span>
                <span className="amount text-emerald-400 font-mono">
                  {formatCurrency(item.total)}{" "}
                  <span className="text-xs text-slate-500 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-500"
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
