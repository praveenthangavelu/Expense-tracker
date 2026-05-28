import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  maxWidth,
}) => {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current();

      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(focusableSelector);
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        modalRef.current?.querySelector(focusableSelector)?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Determine viewport width to adjust framer motion animation dynamically
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const widthClass = maxWidth || (
    size === "wide"
      ? "md:max-w-[800px]"
      : size === "lg"
      ? "md:max-w-[640px]"
      : "md:max-w-[520px]"
  );

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--modal-overlay)] p-0 md:p-4 backdrop-blur-[8px]"
          onMouseDown={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={
              isMobile
                ? { y: "100%", opacity: 1, scale: 1 }
                : { opacity: 0, y: 20, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              isMobile
                ? { y: "100%", opacity: 1, scale: 1 }
                : { opacity: 0, y: 15, scale: 0.97 }
            }
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 350,
            }}
            className={`w-full ${widthClass} max-h-[90vh] overflow-y-auto bg-[var(--modal-bg)] border border-[var(--border-default)] shadow-[var(--shadow-lg)] rounded-t-[20px] rounded-b-none md:rounded-[20px] absolute bottom-0 md:relative md:bottom-auto p-6 md:p-8`}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-[var(--text-primary)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all duration-300 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] hover:rotate-90"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default Modal;
