import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { usePopups } from "../../hooks/usePopups";

export const HealthTipPopup = ({ popup }) => {
  const { dismissPopup } = usePopups();
  const [timeLeft, setTimeLeft] = useState(12); // 12 seconds countdown
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const { id, tip, saving, healthyEmoji, junkEmoji } = popup;

  // Auto dismiss handler
  useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current);
          dismissPopup(id);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, id, dismissPopup]);

  const handleAccept = () => {
    const acceptedCount = parseInt(localStorage.getItem("tips_accepted_count") || "0", 10);
    localStorage.setItem("tips_accepted_count", acceptedCount + 1);
    dismissPopup(id);
  };

  const percentLeft = (timeLeft / 12) * 100;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] flex justify-center md:bottom-6 md:right-6 md:left-auto md:justify-end">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full max-w-[400px] overflow-hidden rounded-[20px] p-7 shadow-2xl transition-all duration-300"
        style={{
          background: "var(--popup-celebration-bg)",
          border: "1px solid var(--popup-celebration-border)",
          boxShadow: "var(--shadow-glow-mint)",
        }}
      >
        {/* A. Close Button */}
        <button
          onClick={() => dismissPopup(id)}
          className="absolute top-4 right-4 rounded-full p-1 text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* B. Top Emoji Transition Row */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-10 w-24 items-center justify-center rounded-xl bg-[var(--bg-hover)] px-2 overflow-hidden border border-[var(--border-subtle)]">
            <motion.span
              className="text-2xl select-none"
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
            >
              {junkEmoji || "🍔"}
            </motion.span>
            <motion.span
              className="absolute text-xs text-[var(--mint)] font-bold opacity-0"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              ➔
            </motion.span>
            <motion.span
              className="absolute text-2xl select-none"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
            >
              {healthyEmoji || "🥗"}
            </motion.span>
          </div>
          <span className="font-headline text-lg font-bold tracking-tight text-[var(--mint)]">
            Healthier Swap?
          </span>
        </div>

        {/* C. Tip Text */}
        <p className="font-body text-sm leading-relaxed text-[var(--text-secondary)] select-text mb-4">
          {tip}
        </p>

        {/* D. Savings Tag Box */}
        {saving && (
          <div className="mb-5 rounded-[10px] bg-[var(--mint-soft)] border border-[var(--popup-celebration-border)] p-3">
            <span className="font-mono text-xs font-bold text-[var(--mint)] flex items-center gap-1.5">
              💰 You could save {saving}
            </span>
          </div>
        )}

        {/* E. Action Buttons Row */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => dismissPopup(id)}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all duration-200"
          >
            Maybe next time 😅
          </button>
          <button
            onClick={handleAccept}
            className="rounded-xl bg-[var(--mint)] px-4 py-2.5 text-xs font-bold text-[#05060B] hover:bg-[#4dd2a1] transition-all duration-200 shadow-lg cursor-pointer"
          >
            Good idea! 🥗
          </button>
        </div>

        {/* F. Progress Countdown Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: `${percentLeft}%`,
              backgroundColor: "var(--mint)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default HealthTipPopup;
