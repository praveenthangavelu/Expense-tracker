import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORY_EMOJIS } from "../../utils/constants";

const OverspendingAlerts = ({ overspending = [] }) => {
  const [expanded, setExpanded] = useState({});

  const toggle = (category) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="glass rounded-[24px] p-6 border border-[var(--border-default)] flex flex-col justify-between">
      <div>
        <h3 className="font-headline text-lg font-bold text-white mb-4">Where you're overspending 🔴</h3>
        {overspending.length > 0 ? (
          <div className="space-y-4">
            {overspending.map((item) => {
              const isExpanded = !!expanded[item.category];
              const ratio = Math.min(100, Math.round((item.currentSpend / Math.max(1, item.averageSpend)) * 100));

              return (
                <div
                  key={item.category}
                  className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 space-y-3 cursor-pointer hover:border-[var(--border-strong)] transition-colors"
                  onClick={() => toggle(item.category)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl select-none">{CATEGORY_EMOJIS[item.category] || "📌"}</span>
                      <span className="text-sm font-semibold text-white">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-[var(--flame)] font-bold">₹{item.overBy} over</span>
                      <span className="text-[10px] text-[var(--text-secondary)] block">avg: ₹{item.averageSpend}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--flame)]" style={{ width: `${ratio}%` }} />
                    <div className="absolute h-full w-[2px] bg-white/40 top-0" style={{ left: "76%" }} />
                  </div>

                  {/* Expandable Recommendation */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pt-2 border-t border-white/5 mt-2 flex justify-between items-start"
                      >
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed select-text flex-1 pr-3">
                          {item.suggestion}
                        </p>
                        <div className="h-6 w-6 rounded-full bg-[var(--flame-soft)] text-[var(--flame)] text-[10px] font-bold flex items-center justify-center shrink-0">
                          +{item.overByPercent}%
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex justify-center text-[10px] text-[var(--text-dim)] font-bold mt-1">
                    {isExpanded ? (
                      <span className="flex items-center gap-0.5">Collapse <ChevronUp className="h-3 w-3" /></span>
                    ) : (
                      <span className="flex items-center gap-0.5">View details <ChevronDown className="h-3 w-3" /></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[rgba(99,228,181,0.15)] bg-[var(--mint-soft)] p-6 text-center">
            <span className="text-3xl select-none">🎉</span>
            <h4 className="font-headline text-sm font-bold text-[var(--mint)] mt-2">All Clear!</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1 select-text">
              You are within normal ranges for every category. Keep up the good discipline!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverspendingAlerts;
