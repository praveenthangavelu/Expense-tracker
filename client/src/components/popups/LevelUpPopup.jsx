import { motion } from "framer-motion";
import { usePopups } from "../../context/PopupContext";

const LevelUpPopup = ({ popup }) => {
  const { dismissPopup } = usePopups();
  const { newLevel, newTitle, newIcon, newColor } = popup || {};

  if (!newLevel) return null;

  const handleDismiss = () => {
    dismissPopup(popup.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--modal-overlay)] backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-2xl border text-center"
        style={{
          background: "var(--modal-bg)",
          borderColor: `${newColor}40`,
          boxShadow: `0 0 60px ${newColor}30, var(--shadow-lg)`,
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${newColor}, transparent)` }}
        />

        <div className="p-6">
          {/* Radiating rings */}
          <div className="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  borderColor: `${newColor}20`,
                  width: `${100 + i * 30}%`,
                  height: `${100 + i * 30}%`,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              />
            ))}

            {/* Level number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full text-3xl"
              style={{
                background: `linear-gradient(135deg, ${newColor}25, ${newColor}10)`,
                border: `2px solid ${newColor}60`,
                boxShadow: `0 0 30px ${newColor}30`,
              }}
            >
              {newIcon}
            </motion.div>
          </div>

          {/* Level Up text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-1 text-[10px] font-bold tracking-[0.3em] uppercase"
            style={{ color: newColor }}
          >
            ⬆️ Level Up!
          </motion.div>

          {/* Level number */}
          <motion.h2
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="mb-1 font-headline text-4xl font-black"
            style={{ color: newColor }}
          >
            Level {newLevel}
          </motion.h2>

          {/* Title */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6 text-lg font-semibold text-[var(--text-primary)]"
          >
            {newTitle}
          </motion.p>

          {/* Encouragement */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6 text-xs text-[var(--text-secondary)]"
          >
            Keep tracking your expenses and smashing goals!
          </motion.p>

          {/* Dismiss */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={handleDismiss}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, ${newColor}, ${newColor}80)`,
            }}
          >
            Let's Go! 🚀
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LevelUpPopup;
