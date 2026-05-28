import { motion } from "framer-motion";
import { usePopups } from "../../context/PopupContext";
import { gamificationService } from "../../services/gamificationService";

const tierColors = {
  bronze: { bg: "rgba(205, 127, 50, 0.15)", border: "rgba(205, 127, 50, 0.4)", text: "#CD7F32", glow: "0 0 30px rgba(205, 127, 50, 0.3)" },
  silver: { bg: "rgba(192, 192, 192, 0.15)", border: "rgba(192, 192, 192, 0.4)", text: "#C0C0C0", glow: "0 0 30px rgba(192, 192, 192, 0.3)" },
  gold: { bg: "rgba(255, 215, 0, 0.15)", border: "rgba(255, 215, 0, 0.4)", text: "#FFD700", glow: "0 0 30px rgba(255, 215, 0, 0.3)" },
  platinum: { bg: "rgba(124, 111, 255, 0.15)", border: "rgba(124, 111, 255, 0.4)", text: "#7C6FFF", glow: "0 0 30px rgba(124, 111, 255, 0.3)" },
  diamond: { bg: "rgba(99, 228, 181, 0.15)", border: "rgba(99, 228, 181, 0.4)", text: "#63E4B5", glow: "0 0 30px rgba(99, 228, 181, 0.3)" },
};

const BadgePopup = ({ popup }) => {
  const { dismissPopup } = usePopups();
  const badge = popup?.badge;
  if (!badge) return null;

  const colors = tierColors[badge.tier] || tierColors.bronze;

  const handleDismiss = async () => {
    try {
      await gamificationService.markBadgesSeen([badge._id]);
    } catch (e) {
      // Silent fail
    }
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
        initial={{ scale: 0.5, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[320px] rounded-2xl border p-6 text-center"
        style={{
          background: "var(--modal-bg)",
          borderColor: colors.border,
          boxShadow: `${colors.glow}, var(--shadow-lg)`,
        }}
      >
        {/* Confetti sparkles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full"
              style={{
                background: colors.text,
                left: `${15 + Math.random() * 70}%`,
                top: `${10 + Math.random() * 30}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [0, -20, -40],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Header label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-2 text-[10px] font-bold tracking-[0.3em] uppercase"
          style={{ color: colors.text }}
        >
          🏅 Badge Unlocked!
        </motion.div>

        {/* Badge Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
          style={{
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            boxShadow: colors.glow,
          }}
        >
          {badge.icon}
        </motion.div>

        {/* Badge Name */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-1 font-headline text-xl font-bold text-[var(--text-primary)]"
        >
          {badge.name}
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-4 text-sm text-[var(--text-secondary)]"
        >
          {badge.description}
        </motion.p>

        {/* XP Reward */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold"
          style={{ background: colors.bg, color: colors.text }}
        >
          ✨ +{badge.xpReward} XP
        </motion.div>

        {/* Tier label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.text }}
        >
          {badge.tier} Tier {badge.isSecret && "• Secret Badge 🤫"}
        </motion.div>

        {/* Dismiss button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={handleDismiss}
          className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 hover:brightness-110"
          style={{
            background: `linear-gradient(135deg, ${colors.text}, ${colors.border})`,
          }}
        >
          Awesome! 🎉
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default BadgePopup;
