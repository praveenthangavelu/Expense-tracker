import clsx from "clsx";

const Card = ({ children, className, header, footer, hover = true }) => (
  <section
    className={clsx(
      "glass rounded-3xl p-5 transition",
      hover && "hover:border-white/12 hover:bg-white/[0.04]",
      className,
    )}
  >
    {header && <div className="mb-4">{header}</div>}
    {children}
    {footer && <div className="mt-4 border-t border-white/5 pt-4">{footer}</div>}
  </section>
);

export default Card;
