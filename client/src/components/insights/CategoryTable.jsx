import { motion } from "framer-motion";
import clsx from "clsx";
import Card from "../common/Card";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";

export const CategoryTable = ({ categories = [], totalExpenses = 0 }) => {
  return (
    <Card
      header={
        <div>
          <h3 className="font-display text-base font-bold text-white">Spending Breakdown</h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Ranked expense breakdown by category
          </p>
        </div>
      }
      className="overflow-hidden"
    >
      {categories.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] font-medium text-center py-10">
          No expenses recorded for this month.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase tracking-wider font-bold">
                <th className="pb-3 px-2">Category</th>
                <th className="pb-3 px-2 text-right">Amount</th>
                <th className="pb-3 px-2 text-right">%</th>
                <th className="pb-3 px-4 w-44">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {categories.map((category, idx) => {
                const percentage = totalExpenses
                  ? Math.round((category.amount / totalExpenses) * 100)
                  : 0;

                // Progress bar colors by rank
                const progressColors = [
                  "bg-[var(--electric)]",
                  "bg-[var(--arctic)]",
                  "bg-[var(--solar)]",
                ];
                const barColor = progressColors[idx] || "bg-[var(--text-secondary)]";

                return (
                  <tr
                    key={category.name}
                    className="hover:bg-[var(--bg-hover)] transition-all duration-200"
                  >
                    <td className="py-3.5 px-2 font-semibold text-white flex items-center gap-2">
                      <span className="text-base select-none">
                        {CATEGORY_EMOJIS[category.name] || "📌"}
                      </span>
                      <span>{category.name}</span>
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-semibold text-[var(--text-primary)]">
                      {formatCurrency(category.amount)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono font-medium text-[var(--text-secondary)]">
                      {percentage}%
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-1.5 w-full rounded-full bg-[var(--bg-base)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={clsx("h-full rounded-full", barColor)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default CategoryTable;
