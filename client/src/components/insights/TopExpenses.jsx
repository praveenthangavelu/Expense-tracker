import { format } from "date-fns";
import { Award } from "lucide-react";
import clsx from "clsx";
import Card from "../common/Card";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatCurrency";

const safeFormatDate = (dateStr, formatStr = "dd MMM") => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  try {
    return format(d, formatStr);
  } catch {
    return "N/A";
  }
};

export const TopExpenses = ({ biggest = [] }) => {
  return (
    <Card
      header={
        <div>
          <h3 className="font-display text-base font-bold text-white">Top 5 Expenses</h3>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Single largest expense records
          </p>
        </div>
      }
    >
      <div className="space-y-2">
        {biggest.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] font-medium text-center py-10">
            No expenses recorded.
          </p>
        ) : (
          biggest.map((item, index) => {
            const isFirst = index === 0;
            return (
              <div
                key={item._id}
                className={clsx(
                  "flex items-center justify-between rounded-xl p-3 border transition-all duration-200 hover:translate-x-1",
                  isFirst
                    ? "bg-[var(--electric-soft)] border-[rgba(124,111,255,0.2)] text-[var(--text-primary)]"
                    : "bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={clsx(
                      "font-bold text-xs shrink-0 flex items-center justify-center h-5 w-5 rounded",
                      isFirst
                        ? "bg-[var(--electric)] text-white"
                        : "bg-[var(--bg-surface)] text-[var(--text-dim)]"
                    )}
                  >
                    {isFirst ? <Award className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={clsx(
                        "font-semibold text-xs truncate",
                        isFirst ? "text-white" : "text-[var(--text-primary)]"
                      )}
                    >
                      {item.note || item.category}
                    </p>
                    <p className="text-[10px] text-[var(--text-dim)] font-mono leading-none mt-0.5">
                      {CATEGORY_EMOJIS[item.category] || "📌"} {item.category} •{" "}
                      {safeFormatDate(item.date, "dd MMM")}
                    </p>
                  </div>
                </div>
                <span
                  className={clsx(
                    "amount font-mono text-xs font-bold",
                    isFirst ? "text-[var(--electric)] text-sm" : "text-[var(--text-primary)]"
                  )}
                >
                  {formatCurrency(item.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default TopExpenses;
