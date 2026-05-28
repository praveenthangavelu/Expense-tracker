import clsx from "clsx";
import { motion } from "framer-motion";

const Card = ({
  children,
  className,
  header,
  footer,
  hover = true,
  variant = "default",
  dots = false,
  ...props
}) => {
  const isGlowMint = variant === "glow-mint" || variant === "GLOW-MINT";
  const isGlowFlame = variant === "glow-flame" || variant === "GLOW-FLAME";
  const isGlowElectric = variant === "glow-electric" || variant === "GLOW-ELECTRIC";
  const isGlass = variant === "glass" || variant === "GLASS";

  return (
    <motion.section
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={clsx(
        "relative rounded-2xl p-6 border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isGlass
          ? "bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-[var(--glass-blur)]"
          : "bg-[var(--card-bg)] border-[var(--card-border)]",
        hover && !isGlass && "hover:bg-[var(--card-hover-bg)] hover:shadow-[var(--shadow-md)]",
        hover && isGlass && "hover:bg-[var(--glass-bg)]/80",
        isGlowMint && "border-t-[var(--mint)]/30 hover:shadow-[var(--shadow-glow-mint)]",
        isGlowFlame && "border-t-[var(--flame)]/30 hover:shadow-[var(--shadow-glow-flame)]",
        isGlowElectric && "border-t-[var(--electric)]/30 hover:shadow-[var(--shadow-glow-electric)]",
        className,
      )}
      {...props}
    >
      {dots && (
        <>
          <span className="absolute top-2 right-2 h-1 w-1 rounded-full bg-[var(--mint)] opacity-30 pointer-events-none" />
          <span className="absolute bottom-2 left-2 h-1 w-1 rounded-full bg-[var(--mint)] opacity-30 pointer-events-none" />
        </>
      )}
      {header && <div className="mb-4">{header}</div>}
      {children}
      {footer && <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">{footer}</div>}
    </motion.section>
  );
};

export default Card;
