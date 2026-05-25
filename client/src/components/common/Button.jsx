import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

const variants = {
  primary:
    "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-glow hover:from-emerald-300 hover:to-teal-400",
  danger:
    "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-coral hover:from-red-400 hover:to-rose-400",
  ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
  outline:
    "border border-white/10 bg-white/[0.02] text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/10",
};

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
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
    whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
    className={clsx(
      "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60",
      variants[variant],
      sizes[size],
      className,
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </motion.button>
);

export default Button;
