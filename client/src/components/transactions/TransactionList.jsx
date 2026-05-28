import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import Card from "../common/Card";
import { TransactionSkeleton } from "../common/Skeleton";
import { useTransactions } from "../../context/TransactionContext";
import { dateGroupLabel } from "../../utils/formatDate";
import { formatCurrency } from "../../utils/formatCurrency";
import TransactionItem from "./TransactionItem";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const groupVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
    },
  },
};

const TransactionList = ({ onEdit, onDelete, onViewReceipt }) => {
  const { transactions, loading } = useTransactions();

  const grouped = useMemo(() => {
    return transactions.reduce((groups, transaction) => {
      const label = dateGroupLabel(transaction.date);
      const existing = groups[label] || { items: [], net: 0 };
      existing.items.push(transaction);
      existing.net +=
        transaction.type === "income" ? transaction.amount : -transaction.amount;
      groups[label] = existing;
      return groups;
    }, {});
  }, [transactions]);

  if (loading) {
    return (
      <Card className="p-4">
        <TransactionSkeleton />
      </Card>
    );
  }

  if (!transactions.length) {
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[var(--bg-base)] flex items-center justify-center border border-[var(--border-default)]">
          <AlertCircle className="h-6 w-6 text-[var(--text-dim)]" />
        </div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          No transactions found
        </h3>
        <p className="text-xs text-[var(--text-secondary)] font-medium">
          Add your first transaction or adjust your active filters.
        </p>
      </Card>
    );
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {Object.entries(grouped).map(([label, group]) => (
        <motion.div key={label} variants={groupVariants}>
          <Card className="p-4" hover={false}>
            {/* Group date header with divider line */}
            <div className="mb-3.5 flex items-center justify-between gap-4 px-2 select-none">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)] shrink-0">
                {label}
              </h3>
              <div className="flex-grow h-[1px] bg-[var(--border-subtle)]" />
              <p
                className={`amount text-xs font-semibold font-mono ${
                  group.net >= 0 ? "text-[var(--income-text)]" : "text-[var(--expense-text)]"
                }`}
              >
                {group.net > 0 && "+"}
                {formatCurrency(group.net)}
              </p>
            </div>
            
            <div className="space-y-1">
              {group.items.map((transaction, idx) => (
                <div key={transaction._id} className="relative">
                  <TransactionItem
                    transaction={transaction}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewReceipt={onViewReceipt}
                  />
                  {/* Custom separator line with left alignment offset */}
                  {idx < group.items.length - 1 && (
                    <span className="absolute bottom-0 left-[60px] right-4 h-[1px] bg-[var(--border-subtle)]" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default TransactionList;
