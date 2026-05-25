import clsx from "clsx";

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
          "relative rounded-2xl border bg-white/[0.03] transition focus-within:border-emerald-400/70 focus-within:shadow-[0_0_0_4px_rgba(16,185,129,0.08)]",
          error ? "border-red-400/70" : "border-white/10",
          className,
        )}
      >
        {Icon && (
          <Icon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition group-focus-within:text-emerald-300" />
        )}
        <input
          id={inputId}
          type={type}
          placeholder=" "
          className={clsx(
            "peer w-full rounded-2xl border-0 bg-transparent px-4 pb-2.5 pt-6 text-white outline-none ring-0 placeholder:text-transparent focus:ring-0",
            Icon && "pl-12",
          )}
          {...props}
        />
        <span
          className={clsx(
            "pointer-events-none absolute top-2 text-xs font-medium text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-300",
            Icon ? "left-12" : "left-4",
          )}
        >
          {label}
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </label>
  );
};

export default Input;
