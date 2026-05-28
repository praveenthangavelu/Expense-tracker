import { motion } from "framer-motion";

export const SpendingPatterns = ({ patterns = [] }) => {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="glass rounded-[24px] p-6 border border-[var(--border-default)] text-center">
        <span className="text-3xl select-none">🔍</span>
        <h3 className="font-headline text-lg font-bold text-white mt-2">No Spending Patterns</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1 select-text">
          No distinct behavior patterns were detected for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-[24px] p-6 border border-[var(--border-default)]">
      <h3 className="font-headline text-lg font-bold text-white mb-2">Spending patterns 🔍</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-6 select-text">
        Staggered pattern tracking highlighting potential impulse triggers.
      </p>

      <div className="space-y-3">
        {patterns.map((item, idx) => {
          let icon = "📈";
          let title = "Spending Spike";
          let color = "var(--electric)";
          let colorSoft = "var(--electric-soft)";

          if (item.pattern === "late_night") {
            icon = "🌙";
            title = "Late-Night Buying";
            color = "var(--solar)";
            colorSoft = "var(--solar-soft)";
          } else if (item.pattern === "impulse") {
            icon = "⚡";
            title = "Micro Impulses";
            color = "var(--flame)";
            colorSoft = "var(--flame-soft)";
          } else if (item.pattern === "weekend_spike") {
            icon = "🎉";
            title = "Weekend Splurging";
            color = "var(--mint)";
            colorSoft = "var(--mint-soft)";
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-4 p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] items-start"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border text-lg select-none"
                style={{
                  borderColor: `rgba(255,255,255,0.06)`,
                  backgroundColor: colorSoft,
                  color: color,
                }}
              >
                <span style={{ color: color }}>{icon}</span>
              </div>
              <div className="flex-1 space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                  {title}
                </span>
                <p className="text-xs font-semibold text-white truncate">{item.description}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed select-text mt-1">
                  {item.advice}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingPatterns;
