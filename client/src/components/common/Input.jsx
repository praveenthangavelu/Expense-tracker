import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const Input = ({
  label,
  error,
  icon: Icon,
  className,
  id,
  type = "text",
  ...props
}) => {
  const inputId = id || props.name || label;

  return (
    <label className="group block" htmlFor={inputId}>
      <div
        className={clsx(
          "relative rounded-[10px] border bg-[var(--input-bg)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          error
            ? "border-[var(--flame)]/50 focus-within:border-[var(--flame)] focus-within:shadow-[0_0_0_3px_var(--flame-soft)]"
            : "border-[var(--input-border)] focus-within:border-[var(--input-focus-border)] focus-within:shadow-[0_0_0_3px_var(--mint-soft)]",
          className,
        )}
      >
        {Icon && (
          <Icon className={clsx(
            "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)] transition-colors duration-200",
            error ? "group-focus-within:text-[var(--flame)]" : "group-focus-within:text-[var(--mint)]"
          )} />
        )}
        <input
          id={inputId}
          type={type}
          placeholder=" "
          className={clsx(
            "peer w-full rounded-[10px] border-0 bg-transparent px-4 pb-2 pt-6 text-[var(--text-primary)] outline-none ring-0 placeholder:text-transparent focus:ring-0 text-sm font-normal",
            Icon && "pl-12",
          )}
          {...props}
        />
        <span
          className={clsx(
            "pointer-events-none absolute top-1.5 text-xs font-medium text-[var(--text-secondary)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs",
            error ? "peer-focus:text-[var(--flame)]" : "peer-focus:text-[var(--mint)]",
            Icon ? "left-12" : "left-4",
          )}
        >
          {label}
        </span>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-1.5 text-xs font-medium text-[var(--flame)]">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </label>
  );
};

export default Input;
