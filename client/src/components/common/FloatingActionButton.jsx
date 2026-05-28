import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus, X, Camera, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

const FAB_TAP_KEY = "expenseflow_fab_tapped_at";

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Check if idle (2+ hours since last FAB action/tap)
  useEffect(() => {
    try {
      const lastTap = localStorage.getItem(FAB_TAP_KEY);
      if (!lastTap) {
        setShouldPulse(true);
      } else {
        const diffHours = (Date.now() - Number(lastTap)) / (1000 * 60 * 60);
        if (diffHours >= 2) {
          setShouldPulse(true);
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (shouldPulse) {
      setShouldPulse(false);
      try {
        localStorage.setItem(FAB_TAP_KEY, String(Date.now()));
      } catch {
        // Ignored
      }
    }
  };

  const handleAction = (type) => {
    setIsOpen(false);
    if (type === "expense") {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "expense" } })
      );
    } else if (type === "income") {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "income" } })
      );
    } else if (type === "scan") {
      window.dispatchEvent(new CustomEvent("open-receipt-scanner"));
    }
  };

  // Radial positions for options (x, y offsets relative to button center)
  const menuOptions = [
    {
      id: "scan",
      label: "Scan Receipt",
      icon: Camera,
      x: -60,
      y: -60,
      color: "bg-[var(--bg-surface)] text-[var(--mint)] border-[var(--border-default)]",
    },
    {
      id: "income",
      label: "Add Income",
      icon: ArrowDownLeft,
      x: -85,
      y: 0,
      color: "bg-[var(--bg-surface)] text-[var(--mint)] border-[var(--border-default)]",
    },
    {
      id: "expense",
      label: "Add Expense",
      icon: ArrowUpRight,
      x: -60,
      y: 60,
      color: "bg-[var(--bg-surface)] text-[var(--flame)] border-[var(--border-default)]",
    },
  ];

  return (
    <div className="fixed bottom-20 right-5 z-50 md:hidden flex items-center justify-center">
      {/* Dim overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* Radial Options */}
      <AnimatePresence>
        {isOpen &&
          menuOptions.map((opt, i) => (
            <motion.button
              key={opt.id}
              type="button"
              role="menuitem"
              aria-label={opt.label}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1, x: opt.x, y: opt.y }}
              exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { type: "spring", damping: 18, stiffness: 200, delay: i * 0.04 }
              }
              onClick={() => handleAction(opt.id)}
              className={clsx(
                "absolute z-50 flex h-11 w-11 items-center justify-center rounded-full border shadow-[var(--shadow-md)] outline-none active:scale-95 transition-transform",
                opt.color
              )}
            >
              <opt.icon className="h-4.5 w-4.5" />
              {/* Optional absolute text label */}
              <span className="absolute right-12 text-[10px] font-bold text-white bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-subtle)] whitespace-nowrap select-none">
                {opt.label}
              </span>
            </motion.button>
          ))}
      </AnimatePresence>

      {/* Primary Floating Action Trigger */}
      <motion.button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Toggle action menu"
        animate={
          shouldPulse && !isOpen
            ? { scale: [1, 1.05, 1], boxShadow: ["0 0 10px rgba(99,228,181,0.2)", "0 0 25px rgba(99,228,181,0.55)", "0 0 10px rgba(99,228,181,0.2)"] }
            : { scale: 1 }
        }
        transition={shouldPulse && !isOpen ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : undefined}
        whileTap={{ scale: 0.94 }}
        className="relative z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint-gradient)] text-[#05060B] shadow-[var(--shadow-glow-mint)] outline-none active:scale-95"
      >
        <motion.div
          animate={isOpen ? { rotate: 135 } : { rotate: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="flex items-center justify-center"
        >
          {isOpen ? <X className="h-6 w-6 stroke-[2.5px]" /> : <Plus className="h-6 w-6 stroke-[2.5px]" />}
        </motion.div>
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;
