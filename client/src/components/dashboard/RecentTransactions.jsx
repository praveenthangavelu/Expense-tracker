import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

import Card from "../common/Card";
import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { shortDate } from "../../utils/formatDate";

const RecentTransactions = () => {
  const { transactions } = useTransactions();
  const recent = transactions.slice(0, 5);

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sans text-base font-bold text-[var(--text-primary)]">
              Recent Transactions
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Your latest money movement</p>
          </div>
          <Link to="/transactions" className="text-xs font-bold text-[var(--electric)] hover:underline flex items-center gap-0.5">
            View All &rarr;
          </Link>
        </div>
      }
    >
      {recent.length ? (
        <div className="space-y-0 mt-3">
          {recent.map((transaction, index) => {
            const isIncome = transaction.type === "income";
            const amtColor = isIncome ? "text-[var(--income-text)]" : "text-[var(--expense-text)]";
            const prefix = isIncome ? "+" : "−";

            return (
              <motion.div
                key={transaction._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group relative flex h-14 items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category Emoji in Circle */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-hover)] group-hover:bg-[var(--bg-elevated)] text-lg transition-colors">
                    {CATEGORY_EMOJIS[transaction.category] || "📌"}
                  </div>
                  {/* Category Name & Note */}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">{transaction.category}</p>
                    <p className="truncate text-[11px] text-[var(--text-secondary)] font-medium">
                      {transaction.note || "No details provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Date Center-Right */}
                  <span className="hidden sm:inline text-[11px] font-medium text-[var(--text-dim)] font-mono">
                    {shortDate(transaction.date)}
                  </span>
                  
                  {/* Amount Right */}
                  <div className="text-right">
                    <p className={`amount text-xs font-semibold ${amtColor} font-mono`}>
                      {prefix}{formatCurrency(transaction.amount)}
                    </p>
                    <span className="sm:hidden text-[10px] text-[var(--text-dim)] font-mono">
                      {shortDate(transaction.date)}
                    </span>
                  </div>
                </div>

                {/* Left Margin Aligned Divider (excluding the last item) */}
                {index < recent.length - 1 && (
                  <span className="absolute bottom-0 left-[52px] right-4 h-[1px] bg-[var(--border-subtle)]" />
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] p-8 text-[var(--text-secondary)] gap-2">
          <AlertCircle className="h-8 w-8 text-[var(--text-dim)]" />
          <p className="text-sm font-medium">No transactions yet</p>
        </div>
      )}
    </Card>
  );
};

export default RecentTransactions;
