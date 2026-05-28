import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Award, AlertTriangle, Compass, Users } from "lucide-react";
import clsx from "clsx";

const bgColors = {
  positive:
    "border-[rgba(99,228,181,0.15)] bg-[rgba(99,228,181,0.02)] hover:bg-[rgba(99,228,181,0.04)]",
  warning:
    "border-[rgba(255,179,71,0.15)] bg-[rgba(255,179,71,0.02)] hover:bg-[rgba(255,179,71,0.04)]",
  neutral: "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:bg-[var(--bg-hover)]",
  achievement:
    "border-[rgba(124,111,255,0.15)] bg-[rgba(124,111,255,0.02)] hover:bg-[rgba(124,111,255,0.04)] relative overflow-hidden",
};

const titleColors = {
  positive: "text-[var(--mint)]",
  warning: "text-[var(--solar)]",
  neutral: "text-[var(--text-primary)]",
  achievement: "text-[var(--electric)]",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

export const SmartInsights = ({ insights = [], familyInsights = [], isAdmin = false }) => {
  // Categorize personal insights
  const groups = useMemo(() => {
    const list = {
      achievements: [],
      warnings: [],
      patterns: [],
    };

    insights.forEach((ins) => {
      if (ins.type === "achievement" || ins.type === "positive") {
        list.achievements.push(ins);
      } else if (ins.type === "warning") {
        list.warnings.push(ins);
      } else {
        list.patterns.push(ins);
      }
    });

    return list;
  }, [insights]);

  const renderInsightGrid = (items) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((insight, idx) => (
        <div
          key={idx}
          className={clsx(
            "flex items-start gap-4 rounded-2xl border p-5 transition-all duration-300 shadow-[var(--shadow-sm)]",
            bgColors[insight.type] || bgColors.neutral
          )}
        >
          <div className="text-3xl select-none leading-none pt-0.5 shrink-0">
            {insight.emoji || "💡"}
          </div>
          <div className="space-y-1 min-w-0">
            <p
              className={clsx(
                "font-bold text-sm tracking-tight",
                titleColors[insight.type] || titleColors.neutral
              )}
            >
              {insight.title}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              {insight.description}
            </p>
          </div>
          {insight.type === "achievement" && (
            <span className="absolute -right-2 -bottom-2 h-10 w-10 rounded-full bg-[var(--electric-glow)] blur-md animate-pulse pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );

  if (insights.length === 0 && familyInsights.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] p-12 text-center bg-[var(--bg-surface)] max-w-[480px] mx-auto mt-12 space-y-4 shadow-[var(--shadow-sm)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--electric-soft)] text-[var(--electric)] border border-[rgba(124,111,255,0.2)]">
          <Lightbulb className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-white text-base">No insights generated yet</p>
          <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed">
            We require more recorded transactions to compute spending patterns, savings rates, and MoM
            predictions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-8"
    >
      {/* Achievements Category */}
      {groups.achievements.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[var(--text-dim)]">
            <Award className="h-4 w-4 text-[var(--electric)]" />
            <span>Achievements & Positives</span>
          </h3>
          {renderInsightGrid(groups.achievements)}
        </motion.div>
      )}

      {/* Warnings Category */}
      {groups.warnings.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[var(--text-dim)]">
            <AlertTriangle className="h-4 w-4 text-[var(--solar)]" />
            <span>Budget & Trend Warnings</span>
          </h3>
          {renderInsightGrid(groups.warnings)}
        </motion.div>
      )}

      {/* Patterns Category */}
      {groups.patterns.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[var(--text-dim)]">
            <Compass className="h-4 w-4 text-[var(--mint)]" />
            <span>Spending Behavior & Patterns</span>
          </h3>
          {renderInsightGrid(groups.patterns)}
        </motion.div>
      )}

      {/* Family Insights (Admin Only) */}
      {isAdmin && familyInsights.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3 pt-4">
          <hr className="border-[var(--border-subtle)] my-6" />
          <h3 className="font-display text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[var(--text-dim)]">
            <Users className="h-4 w-4 text-[var(--electric)]" />
            <span>Family Group Intelligence</span>
          </h3>
          {renderInsightGrid(familyInsights)}
        </motion.div>
      )}
    </motion.div>
  );
};

export default SmartInsights;
