import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
            <h2 className="font-display text-xl font-bold text-white">
              Recent Transactions
            </h2>
            <p className="text-sm text-slate-500">Your latest money movement</p>
          </div>
          <Link to="/transactions" className="text-sm font-semibold text-emerald-300">
            View All
          </Link>
        </div>
      }
    >
      {recent.length ? (
        <div className="space-y-2">
          {recent.map((transaction, index) => (
            <motion.div
              key={transaction._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.04]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-xl">
                {CATEGORY_EMOJIS[transaction.category] || "📌"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{transaction.category}</p>
                <p className="truncate text-sm text-slate-500">
                  {transaction.note || shortDate(transaction.date)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`amount font-bold ${
                    transaction.type === "income" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-slate-500">{shortDate(transaction.date)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
          No transactions yet
        </div>
      )}
    </Card>
  );
};

export default RecentTransactions;
