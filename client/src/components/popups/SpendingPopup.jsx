import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { usePopups } from "../../hooks/usePopups";

export const SpendingPopup = ({ popup }) => {
  const { dismissPopup } = usePopups();
  const [timeLeft, setTimeLeft] = useState(8); // 8 seconds countdown
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const { id, type, emoji, title, message, theme } = popup;

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

  // Style details based on theme variant
  let bgStyle = "";
  let borderStyle = "";
  let glowStyle = "";
  let titleColor = "";
  let btnStyle = "";
  let progressColor = "";

  if (theme === "mint") {
    // Celebration
    bgStyle = "var(--popup-celebration-bg)";
    borderStyle = "1px solid var(--popup-celebration-border)";
    glowStyle = "var(--shadow-glow-mint)";
    titleColor = "text-[var(--mint)]";
    btnStyle = "bg-[var(--mint)] text-[#05060B] hover:opacity-90";
    progressColor = "var(--mint)";
  } else if (theme === "electric") {
    // Fun Fact
    bgStyle = "var(--popup-funfact-bg)";
    borderStyle = "1px solid var(--popup-funfact-border)";
    glowStyle = "var(--shadow-glow-electric)";
    titleColor = "text-[var(--electric)]";
    btnStyle = "bg-[var(--electric)] text-white hover:opacity-90";
    progressColor = "var(--electric)";
  } else if (theme === "solar") {
    // Gentle Nudge
    bgStyle = "var(--popup-nudge-bg)";
    borderStyle = "1px solid var(--popup-nudge-border)";
    glowStyle = "var(--shadow-sm)";
    titleColor = "text-[var(--solar)]";
    btnStyle = "bg-[var(--solar)] text-[#05060B] hover:opacity-90";
    progressColor = "var(--solar)";
  } else {
    // Motivational (arctic)
    bgStyle = "var(--popup-motivation-bg)";
    borderStyle = "1px solid var(--popup-motivation-border)";
    glowStyle = "var(--shadow-sm)";
    titleColor = "text-[var(--arctic)]";
    btnStyle = "bg-[var(--arctic)] text-[#05060B] hover:opacity-90";
    progressColor = "var(--arctic)";
  }

  // Animation variants for emojis
  const getEmojiAnimation = () => {
    if (theme === "mint") {
      // Celebration: bounce 3 times
      return {
        animate: {
          y: [0, -12, 0, -12, 0, -6, 0],
        },
        transition: {
          duration: 1.2,
          ease: "easeOut",
        },
      };
    } else if (theme === "electric") {
      // Fun Fact: wobble
      return {
        animate: {
          rotate: [0, -12, 12, -8, 8, -4, 4, 0],
        },
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        },
      };
    } else if (theme === "solar") {
      // Gentle Nudge: subtle think tilt
      return {
        animate: {
          rotate: [-6, 6, -6],
        },
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
      };
    } else {
      // Motivational: float
      return {
        animate: {
          y: [0, -8, 0],
        },
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        },
      };
    }
  };

  // Sparkles generation for Fun Fact
  const sparks = Array.from({ length: 5 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 40 + 10}%`,
    right: `${Math.random() * 40 + 10}%`,
    delay: `${i * 0.25}s`,
    size: Math.random() * 6 + 4,
  }));

  // Floating dots for Motivation
  const dots = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 80 + 10}%`,
    delay: `${i * 1.5}s`,
    duration: `${Math.random() * 4 + 8}s`,
    size: Math.random() * 5 + 3,
  }));

  // Confetti generation for Celebration
  const colors = ["#63E4B5", "#7C6FFF", "#FF6B6B", "#FFB347", "#47C9FF"];
  const confettiParticles = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    x: Math.random() * 160 - 80,
    y: Math.random() * -120 - 45,
    r: Math.random() * 360,
    size: Math.random() * 6 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const percentLeft = (timeLeft / 8) * 100;

  return (
    <>
      <style>{`
        @keyframes twinkleSparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes undulateWave {
          0% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-3px) scaleY(1.08); }
          100% { transform: translateY(0px) scaleY(1); }
        }
        @keyframes driftUpDots {
          0% { transform: translateY(40px); opacity: 0; }
          15% { opacity: 0.15; }
          85% { opacity: 0.15; }
          100% { transform: translateY(-70px); opacity: 0; }
        }
      `}</style>

      <div className="fixed bottom-20 left-4 right-4 z-[9998] flex justify-center md:bottom-6 md:right-6 md:left-auto md:justify-end">
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-full max-w-[380px] overflow-hidden rounded-[20px] p-6 shadow-2xl transition-all duration-300"
          style={{
            background: bgStyle,
            border: borderStyle,
            boxShadow: glowStyle,
          }}
        >
          {/* A. Dynamic Background Visual Effects */}
          {theme === "mint" && (
            // Celebration Confetti
            <>
              {confettiParticles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute top-6 left-6 rounded-[2px]"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.r }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              ))}
            </>
          )}

          {theme === "electric" && (
            // Fun Fact Sparkles
            <>
              {sparks.map((s) => (
                <div
                  key={s.id}
                  className="absolute rounded-full bg-white opacity-0"
                  style={{
                    top: s.top,
                    right: s.right,
                    width: s.size,
                    height: s.size,
                    boxShadow: "0 0 10px white",
                    animation: `twinkleSparkle 1.8s infinite ease-in-out`,
                    animationDelay: s.delay,
                  }}
                />
              ))}
            </>
          )}

          {theme === "solar" && (
            // Gentle Nudge SVG Undulating Wave
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <svg
                width="64"
                height="100"
                viewBox="0 0 64 100"
                fill="none"
                style={{
                  animation: "undulateWave 4s infinite ease-in-out",
                }}
              >
                <path
                  d="M10 10 C 30 30, 0 70, 50 90"
                  stroke="var(--solar)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          {theme === "arctic" && (
            // Motivational Floating Dots
            <>
              {dots.map((d) => (
                <div
                  key={d.id}
                  className="absolute bottom-0 rounded-full bg-[var(--arctic)] opacity-0"
                  style={{
                    left: d.left,
                    width: d.size,
                    height: d.size,
                    animation: `driftUpDots ${d.duration} infinite linear`,
                    animationDelay: d.delay,
                  }}
                />
              ))}
            </>
          )}

          {/* B. Close Button */}
          <button
            onClick={() => dismissPopup(id)}
            className="absolute top-4 right-4 rounded-full p-1 text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* C. Popup Content Layout */}
          <div className="flex gap-4 items-start pr-4">
            <motion.div
              className="text-[48px] select-none shrink-0"
              {...getEmojiAnimation()}
            >
              {emoji}
            </motion.div>
            <div className="flex-1 space-y-1 min-w-0">
              <h4 className={`font-headline text-lg font-bold tracking-tight ${titleColor}`}>
                {title}
              </h4>
              <p className="font-body text-sm leading-relaxed text-[var(--text-secondary)] select-text">
                {message}
              </p>
            </div>
          </div>

          {/* D. Action Dismiss Button */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => dismissPopup(id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${btnStyle}`}
            >
              {theme === "mint" && "Awesome! 🎉"}
              {theme === "electric" && "Cool! 😎"}
              {theme === "solar" && "Got it 👍"}
              {theme === "arctic" && "Thanks! 💙"}
            </button>
          </div>

          {/* E. Countdown Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div
              className="h-full transition-all duration-100 ease-linear"
              style={{
                width: `${percentLeft}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SpendingPopup;
