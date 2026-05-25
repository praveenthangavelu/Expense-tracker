import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, AlertOctagon, X, ShieldAlert } from "lucide-react";
import { budgetService } from "../../services/budgetService";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAuth } from "../../context/AuthContext";

export const BudgetAlert = () => {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStatus = async () => {
      try {
        const res = await budgetService.getBudgetStatus();
        setStatus(res.data);
      } catch (err) {
        console.error("Failed to fetch budget status", err);
      }
    };
    fetchStatus();
  }, [isAuthenticated]);

  if (!status) return null;

  const alerts = [];

  // Check overall budget
  if (status.overall && status.overall.limit > 0 && status.overall.status !== "safe") {
    const key = "overall";
    if (!dismissed.includes(key)) {
      alerts.push({
        key,
        type: status.overall.status,
        label: "Overall Monthly Budget",
        limit: status.overall.limit,
        spent: status.overall.spent,
        pct: status.overall.percentage,
      });
    }
  }

  // Check category budgets
  if (status.categories && status.categories.length > 0) {
    status.categories.forEach((cat) => {
      if (cat.limit > 0 && cat.status !== "safe") {
        const key = `category-${cat.category}`;
        if (!dismissed.includes(key)) {
          alerts.push({
            key,
            type: cat.status,
            label: `${cat.category} Category Budget`,
            limit: cat.limit,
            spent: cat.spent,
            pct: cat.percentage,
          });
        }
      }
    });
  }

  if (alerts.length === 0) return null;

  const dismiss = (key) => {
    setDismissed((prev) => [...prev, key]);
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case "exceeded":
        return {
          card: "bg-red-950/40 border-red-500/30 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
          icon: <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />,
          closeBtn: "text-red-400 hover:bg-red-500/10",
        };
      case "danger":
        return {
          card: "bg-orange-500/[0.04] border-orange-500/20 text-orange-200",
          icon: <AlertOctagon className="h-5 w-5 text-orange-400 shrink-0" />,
          closeBtn: "text-orange-400 hover:bg-orange-500/10",
        };
      case "warning":
      default:
        return {
          card: "bg-amber-500/[0.04] border-amber-500/20 text-amber-200",
          icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
          closeBtn: "text-amber-400 hover:bg-amber-500/10",
        };
    }
  };

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const overspent = alert.spent - alert.limit;

          return (
            <motion.div
              key={alert.key}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -15, height: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="overflow-hidden"
            >
              <div
                className={`flex items-start justify-between gap-3 border rounded-2xl p-4 glass ${styles.card}`}
              >
                <div className="flex gap-3">
                  <div className="pt-0.5">{styles.icon}</div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm leading-tight">{alert.label}</p>
                    <p className="text-xs sm:text-sm opacity-80 leading-normal">
                      {alert.type === "exceeded" ? (
                        <>
                          Budget exceeded! You have spent{" "}
                          <span className="font-mono font-bold text-red-400">
                            {formatCurrency(overspent)}
                          </span>{" "}
                          over your{" "}
                          <span className="font-mono">{formatCurrency(alert.limit)}</span> limit.
                        </>
                      ) : alert.type === "danger" ? (
                        <>
                          Almost exceeded!{" "}
                          <span className="font-bold text-orange-400">{alert.pct}%</span> of{" "}
                          <span className="font-mono">{formatCurrency(alert.limit)}</span> used (
                          <span className="font-mono">{formatCurrency(alert.spent)}</span> spent).
                        </>
                      ) : (
                        <>
                          You've used <span className="font-bold text-amber-400">{alert.pct}%</span>{" "}
                          of your{" "}
                          <span className="font-mono">{formatCurrency(alert.limit)}</span> budget (
                          <span className="font-mono">{formatCurrency(alert.spent)}</span> spent).
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(alert.key)}
                  className={`rounded-xl p-1.5 transition shrink-0 ${styles.closeBtn}`}
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default BudgetAlert;
