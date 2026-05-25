import { Edit2, Trash2 } from "lucide-react";

import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";
import { shortDate } from "../../utils/formatDate";

const TransactionItem = ({ transaction, onEdit, onDelete }) => (
  <div
    className="group flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.04]"
    onClick={() => onEdit(transaction)}
    role="button"
    tabIndex={0}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") onEdit(transaction);
    }}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-xl">
      {CATEGORY_EMOJIS[transaction.category] || "📌"}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate font-semibold text-white">{transaction.category}</p>
      <p className="truncate text-sm text-slate-500">{transaction.note || "No note"}</p>
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
    <div className="hidden gap-2 opacity-0 transition group-hover:flex group-hover:opacity-100">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(transaction);
        }}
        className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
        aria-label="Edit transaction"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(transaction);
        }}
        className="rounded-xl p-2 text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"
        aria-label="Delete transaction"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default TransactionItem;
