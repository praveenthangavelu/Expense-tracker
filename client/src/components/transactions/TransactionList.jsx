import { useMemo } from "react";

import Card from "../common/Card";
import { TransactionSkeleton } from "../common/Skeleton";
import { useTransactions } from "../../context/TransactionContext";
import { dateGroupLabel } from "../../utils/formatDate";
import { formatCurrency } from "../../utils/formatCurrency";
import TransactionItem from "./TransactionItem";

const TransactionList = ({ onEdit, onDelete }) => {
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
      <Card>
        <TransactionSkeleton />
      </Card>
    );
  }

  if (!transactions.length) {
    return (
      <Card className="p-10 text-center">
        <p className="font-display text-2xl font-bold text-white">
          No transactions found
        </p>
        <p className="mt-2 text-slate-500">
          Add your first transaction or adjust filters.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([label, group]) => (
        <Card key={label} className="p-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <h3 className="font-display text-lg font-bold text-white">{label}</h3>
            <p
              className={`amount text-sm font-bold ${
                group.net >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {formatCurrency(group.net)}
            </p>
          </div>
          <div className="space-y-1">
            {group.items.map((transaction) => (
              <TransactionItem
                key={transaction._id}
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TransactionList;
