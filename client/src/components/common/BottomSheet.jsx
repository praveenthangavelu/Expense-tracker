import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";

const BottomSheet = ({ isOpen, onClose, title, children, showClose = true }) => {
  const shouldReduceMotion = useReducedMotion();
  const sheetRef = useRef(null);

  // Esc key listeners to close sheet
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Trap page scrolling
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // React portal insertion point
  const portalRoot = document.getElementById("portal-root") || document.body;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Dynamic sheet container */}
        <motion.div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          drag={shouldReduceMotion ? false : "y"}
          dragConstraints={{ top: 0, bottom: 400 }}
          dragElastic={0.15}
          onDragEnd={(e, info) => {
            if (info.offset.y > 100) {
              onClose();
            }
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={
            shouldReduceMotion
              ? { duration: 0.15 }
              : { type: "spring", damping: 25, stiffness: 300 }
          }
          className="relative w-full max-h-[85vh] rounded-t-[24px] border-t border-[var(--border-default)] bg-[var(--bg-surface)] p-6 pb-10 flex flex-col focus:outline-none overflow-y-auto"
        >
          {/* Visual drag handle bar */}
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--text-ghost)]" />

          {/* Title Header */}
          <div className="flex items-center justify-between mb-5 select-none">
            <span className="font-headline text-base font-bold text-white">
              {title}
            </span>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-full bg-[var(--bg-hover)] p-1.5 text-[var(--text-secondary)] hover:text-white outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Child content container */}
          <div className="flex-1 min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(content, portalRoot);
};

export default BottomSheet;
