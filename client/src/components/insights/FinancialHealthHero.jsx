import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

const gradeStyles = (grade) => {
  const normalized = String(grade || "?").toUpperCase();
  if (normalized.startsWith("A")) {
    return {
      color: "text-[var(--mint)]",
      glow: "rgba(99,228,181,0.18)",
      from: "#63E4B5",
      to: "#3ECFA0",
      bgSoft: "rgba(99,228,181,0.06)",
      label: "Excellent",
    };
  }
  if (normalized.startsWith("B")) {
    return {
      color: "text-[var(--electric)]",
      glow: "rgba(124,111,255,0.18)",
      from: "#7C6FFF",
      to: "#6358E0",
      bgSoft: "rgba(124,111,255,0.06)",
      label: "Good Pace",
    };
  }
  if (normalized.startsWith("C")) {
    return {
      color: "text-[var(--solar)]",
      glow: "rgba(255,179,71,0.18)",
      from: "#FFB347",
      to: "#e69f3e",
      bgSoft: "rgba(255,179,71,0.06)",
      label: "Warning",
    };
  }
  return {
    color: "text-[var(--flame)]",
    glow: "rgba(255,107,107,0.18)",
    from: "#FF6B6B",
    to: "#EE5A5A",
    bgSoft: "rgba(255,107,107,0.06)",
    label: "Critical",
  };
};

export const FinancialHealthHero = ({
  score,
  grade,
  topStrength,
  topWeakness,
  oneActionItem,
  summary,
}) => {
  // Support both direct props and summary-wrapped prop
  const activeSummary = summary || { score, grade, topStrength, topWeakness, oneActionItem };
  const {
    score: activeScore = 0,
    grade: activeGrade = "?",
    topStrength: activeTopStrength = "Active expense tracking habit.",
    topWeakness: activeTopWeakness = "No budgets set for core categories.",
    oneActionItem: activeOneActionItem = "Set a strict monthly overall budget to regulate daily burn rates.",
  } = activeSummary;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (activeScore / 100) * circumference;
  const gs = gradeStyles(activeGrade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass rounded-[28px] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 border border-white/[0.08] relative overflow-hidden backdrop-blur-xl group cursor-pointer"
      style={{
        boxShadow: `0 25px 60px -20px ${gs.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Decorative background glow */}
      <span
        className="absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-transform duration-700 group-hover:scale-125"
        style={{ background: gs.from }}
      />

      {/* Animated Grade Circle */}
      <div className="relative h-36 w-36 flex items-center justify-center shrink-0">
        <svg className="absolute transform -rotate-90 w-36 h-36">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-white/[0.03] fill-transparent"
            strokeWidth="10"
          />
          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            className="fill-transparent"
            stroke="url(#heroGradeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="heroGradeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gs.from} />
              <stop offset="100%" stopColor={gs.to} />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex flex-col items-center justify-center relative z-10">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className={`font-headline text-5xl font-black ${gs.color} select-none leading-none tracking-tight`}
          >
            {activeGrade}
          </motion.span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold mt-1.5 opacity-80">
            {gs.label}
          </span>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="flex-1 space-y-5 w-full relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top Strength */}
          <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--bg-base)]/50 border border-white/[0.04] p-4.5 hover:border-white/[0.08] transition-all duration-300">
            <div className="p-1 rounded-lg bg-[var(--mint-soft)]/20 mt-0.5 shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5 text-[var(--mint)]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                Top Strength
              </span>
              <p className="text-xs font-semibold text-white/95 leading-relaxed mt-1 select-text">
                {activeTopStrength}
              </p>
            </div>
          </div>

          {/* Area of Improvement */}
          <div className="flex items-start gap-3.5 rounded-2xl bg-[var(--bg-base)]/50 border border-white/[0.04] p-4.5 hover:border-white/[0.08] transition-all duration-300">
            <div className="p-1 rounded-lg bg-[var(--flame-soft)]/20 mt-0.5 shrink-0">
              <AlertCircle className="h-4.5 w-4.5 text-[var(--flame)]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                Area of Improvement
              </span>
              <p className="text-xs font-semibold text-white/95 leading-relaxed mt-1 select-text">
                {activeTopWeakness}
              </p>
            </div>
          </div>
        </div>

        {/* Action Item banner */}
        <div
          className="rounded-2xl border p-4.5 flex items-center justify-between gap-4 transition-all duration-300 hover:brightness-105"
          style={{
            borderColor: "rgba(124,111,255,0.15)",
            background: "linear-gradient(90deg, rgba(124,111,255,0.06), rgba(99,228,181,0.02))",
          }}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--electric)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--electric)] animate-pulse" />
              Primary Action Directive
            </span>
            <p className="font-sans text-xs font-bold text-white/90 leading-relaxed mt-1.5 select-text">
              {activeOneActionItem}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 text-lg shadow-inner">
            💡
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinancialHealthHero;
