import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

const TabNav = ({ tabs = [], activeTab, onChange }) => {
  const containerRef = useRef(null);
  const tabRefs = useRef({});

  // Keyboard navigation handler for tab accessibility
  const handleKeyDown = (e, index) => {
    let targetIndex = null;
    if (e.key === "ArrowRight") {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      onChange(targetTab.key);
      // Wait for focus
      setTimeout(() => {
        tabRefs.current[targetTab.key]?.focus();
      }, 0);
    }
  };

  // Center active tab on mobile screen when changed
  useEffect(() => {
    if (activeTab && tabRefs.current[activeTab]) {
      tabRefs.current[activeTab].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  return (
    <div className="w-full border-b border-[var(--border-subtle)] overflow-hidden">
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Sub navigation tabs"
        className="flex items-center gap-1 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-0"
      >
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              ref={(el) => (tabRefs.current[tab.key] = el)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              id={`tab-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={clsx(
                "relative flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-colors duration-200 shrink-0 snap-center select-none outline-none border-b-2 border-transparent h-11",
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {Icon && (
                <Icon
                  className={clsx(
                    "h-4 w-4 transition-transform duration-200",
                    isActive ? "text-[var(--mint)]" : "text-current"
                  )}
                />
              )}
              <span>{tab.label}</span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={clsx(
                    "inline-flex items-center justify-center h-4.5 min-w-4.5 rounded-full px-1.5 text-[9px] font-bold font-mono border",
                    isActive
                      ? "bg-[var(--mint-soft)] text-[var(--mint)] border-[rgba(99,228,181,0.2)]"
                      : "bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                  )}
                >
                  {tab.badge}
                </span>
              )}

              {isActive && (
                <motion.div
                  layoutId="tab-active-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--mint)] shadow-[0_1px_8px_var(--mint)]"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNav;
