import { Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { shortDate } from "../../utils/formatDate";

const TransactionItem = ({ transaction, onEdit, onDelete, onViewReceipt }) => {
  const isIncome = transaction.type === "income";
  const amtColor = isIncome ? "text-[var(--income-text)]" : "text-[var(--expense-text)]";
  const prefix = isIncome ? "+" : "−";

  return (
    <motion.div
      layout
      className="group relative flex h-[64px] cursor-pointer items-center justify-between gap-4 rounded-xl px-4 transition-all duration-200 hover:bg-[var(--bg-hover)]"
      onClick={() => onEdit(transaction)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onEdit(transaction);
      }}
    >
      {/* Left: Category Icon, Name, Note */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Emoji Circle with Left Border Accent */}
        <div
          className={clsx(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-base)] text-lg transition-colors duration-200 border-l-2",
            isIncome ? "border-l-[var(--mint)]" : "border-l-[var(--flame)]",
          )}
        >
          {transaction.category === "Food" && transaction.subCategory ? (
            <span>{CATEGORY_EMOJIS[transaction.category] || "🍔"}</span>
          ) : (
            <span>{CATEGORY_EMOJIS[transaction.category] || "📌"}</span>
          )}
        </div>

        {/* Text Container */}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <span>{transaction.category}</span>
            {transaction.subCategory && (
              <span className="rounded-full bg-[var(--electric-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--electric)] uppercase tracking-wider scale-90">
                {transaction.subCategory}
              </span>
            )}
            {transaction.receipt && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (onViewReceipt) onViewReceipt(transaction.receipt);
                }}
                className="text-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                title="View linked receipt"
              >
                🧾
              </button>
            )}
          </p>
          <p className="truncate text-xs text-[var(--text-secondary)] font-medium leading-normal mt-0.5">
            {transaction.note || "No description"}
          </p>
        </div>
      </div>

      {/* Right: Amount, Date, and Hover Actions */}
      <div className="flex items-center gap-3 shrink-0 relative h-full">
        {/* Hover Actions - absolute layout to the left of Amount & Date */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(transaction);
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:text-[var(--electric)] hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer"
            aria-label="Edit transaction"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(transaction);
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:text-[var(--flame)] hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer"
            aria-label="Delete transaction"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Amount & Date - kept clean and static to prevent layout collisions */}
        <div className="text-right">
          <p className={clsx("font-mono text-sm font-semibold tracking-wide", amtColor)}>
            {prefix}{formatCurrency(transaction.amount)}
          </p>
          <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">
            {shortDate(transaction.date)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default TransactionItem;
