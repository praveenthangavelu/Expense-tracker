import React from "react";

const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only fixed top-4 left-4 z-[9999] rounded-xl bg-[var(--bg-elevated)] border border-[var(--mint)] px-6 py-3 text-sm font-semibold text-[var(--mint)] shadow-[var(--shadow-lg)] transition-all outline-none"
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
