import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

const variants = {
  primary:
    "bg-[var(--mint-gradient)] text-[#05060B] hover:shadow-[var(--shadow-glow-mint)] hover:brightness-110 active:brightness-95",
  danger:
    "bg-[var(--flame-gradient)] text-white hover:shadow-[var(--shadow-glow-flame)] hover:brightness-110 active:brightness-95",
  electric:
    "bg-[var(--electric-gradient)] text-white hover:shadow-[var(--shadow-glow-electric)] hover:brightness-110 active:brightness-95",
  ghost:
    "bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]",
  glass:
    "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
};

const sizes = {
  sm: "px-4 py-2 text-xs rounded-[8px]",
  md: "px-5 py-2.5 text-sm rounded-[10px]",
  lg: "px-6 py-3 text-base rounded-[12px]",
};

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  ...props
}) => (
  <motion.button
    type={type}
    whileHover={{ y: disabled || loading ? 0 : -1 }}
    whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
    className={clsx(
      "relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
      variants[variant],
      sizes[size],
      className,
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      </div>
    )}
    <span className={clsx("inline-flex items-center justify-center gap-1.5", loading && "opacity-0 transition-opacity")}>
      {children}
    </span>
  </motion.button>
);

export default Button;
