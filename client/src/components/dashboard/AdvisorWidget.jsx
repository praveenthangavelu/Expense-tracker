import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Gauge, CheckCircle } from "lucide-react";
import advisorService from "../../services/advisorService";

export const AdvisorWidget = () => {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchQuickAdvice = async () => {
    setLoading(true);
    try {
      const res = await advisorService.getQuickAdvice();
      if (res?.success) {
        setAdvice(res.data);
      }
    } catch (err) {
      console.error("Failed to load quick advice", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickAdvice();
  }, []);

  if (loading || !advice) {
    return (
      <div className="glass rounded-3xl p-6 flex flex-col justify-center h-[180px] animate-pulse border border-[var(--border-subtle)]">
        <div className="h-4 w-28 bg-[var(--skeleton-base)] rounded mb-4" />
        <div className="h-6 w-full bg-[var(--skeleton-base)] rounded mb-2" />
        <div className="h-3 w-40 bg-[var(--skeleton-base)] rounded" />
      </div>
    );
  }

  const { summary, spendingVelocity } = advice;
  const { grade, oneActionItem } = summary;

  // Grade color
  let gradeColor = "text-[var(--mint)]";
  let gradeGlow = "var(--shadow-glow-mint)";
  if (grade === "D") {
    gradeColor = "text-[var(--flame)]";
    gradeGlow = "var(--shadow-glow-flame)";
  } else if (grade === "C") {
    gradeColor = "text-[var(--solar)]";
    gradeGlow = "var(--solar-soft)";
  } else if (grade.startsWith("B")) {
    gradeColor = "text-[var(--electric)]";
    gradeGlow = "var(--shadow-glow-electric)";
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass rounded-3xl p-6 hover:border-[var(--border-strong)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
      style={{
        boxShadow: grade.startsWith("A") ? `0 10px 40px -10px ${gradeGlow}` : `0 10px 40px -10px ${gradeGlow}`
      }}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-dim)] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[var(--electric)]" />
            Wise Spending Tracker
          </span>
          <h4 className="font-body text-xs font-medium text-[var(--text-secondary)] leading-relaxed select-text mt-1.5">
            {oneActionItem || "Set category limits next month to save on subscriptions."}
          </h4>
        </div>

        {/* Large Grade Circle */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] relative shadow-inner">
          <span className={`font-headline text-2xl font-extrabold ${gradeColor} select-none`}>
            {grade}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
        {/* Spending Velocity Badge */}
        <span className="flex items-center gap-1.5 text-[10px] font-bold">
          {spendingVelocity.onTrack ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-[var(--mint)]" />
              <span className="text-[var(--mint)] uppercase tracking-wider">On track</span>
            </>
          ) : (
            <>
              <Gauge className="h-3.5 w-3.5 text-[var(--solar)]" />
              <span className="text-[var(--solar)] uppercase tracking-wider">Over pace</span>
            </>
          )}
        </span>

        <Link
          to="/advisor"
          className="text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--electric)] flex items-center gap-1 transition-colors group"
        >
          See full analysis
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

export default AdvisorWidget;
