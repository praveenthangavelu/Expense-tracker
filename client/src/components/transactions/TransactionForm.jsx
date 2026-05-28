import { useEffect, useMemo, useState, useRef } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash2, Image, ArrowLeft, ArrowRight } from "lucide-react";

import Button from "../common/Button";
import ConfirmDialog from "../common/ConfirmDialog";
import Modal from "../common/Modal";
import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { toInputDate, toISOFromInputDate } from "../../utils/formatDate";
import { subCategoryService } from "../../services/subCategoryService";
import usePopups from "../../hooks/usePopups";
import ReceiptScanner from "../receipts/ReceiptScanner";
import categorizationService from "../../services/categorizationService";

const emptyForm = {
  type: "expense",
  amount: "",
  category: "",
  subCategory: null,
  date: toInputDate(),
  note: "",
};

const TransactionForm = ({ isOpen, onClose, transaction, defaultType = "expense", openScanner = false }) => {
  const {
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh,
  } = useTransactions();
  const { addPopupToQueue, triggerActionPopup } = usePopups();
  const shouldReduceMotion = useReducedMotion();

  // Wizard Step State: 1 = Amount, 2 = Category, 3 = Details
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = Next, -1 = Prev

  const [form, setForm] = useState(emptyForm);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [userTouchedCategory, setUserTouchedCategory] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const amountInputRef = useRef(null);
  const noteInputRef = useRef(null);

  const isEdit = Boolean(transaction);

  // Load food subcategories
  useEffect(() => {
    const loadSubCategories = async () => {
      try {
        const res = await subCategoryService.getAll("Food");
        setSubCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load subcategories", err);
      }
    };
    if (isOpen) {
      loadSubCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (transaction) {
        setForm({
          type: transaction.type,
          amount: String(transaction.amount),
          category: transaction.category,
          subCategory: transaction.subCategory || null,
          date: toInputDate(transaction.date),
          note: transaction.note || "",
        });
        setStep(1);
      } else {
        setForm({ ...emptyForm, type: defaultType, date: toInputDate() });
        setStep(1);
      }
      setCategorySuggestion(null);
      setUserTouchedCategory(false);
      setAdvancedExpanded(false);

      // Auto-trigger scanner if requested
      if (isOpen && openScanner && !transaction) {
        setScannerOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [transaction, isOpen, defaultType, openScanner]);

  // Autofocus amount on open
  useEffect(() => {
    if (isOpen && step === 1) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, step]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  // AI Categorization engine listener
  useEffect(() => {
    if (!isOpen || isEdit || form.type !== "expense" || userTouchedCategory) {
      return undefined;
    }

    const note = form.note.trim();
    const amount = Number(form.amount || 0);
    if (note.length < 2 && amount <= 0) {
      const timer = setTimeout(() => {
        setCategorySuggestion(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await categorizationService.categorize({
          note,
          amount,
          date: toISOFromInputDate(form.date),
        });

        if (!active) return;
        const selected = res.data?.selected;
        if (!selected || selected.confidence === "none") {
          setCategorySuggestion(null);
          return;
        }

        setCategorySuggestion({
          ...selected,
          source: res.data?.source,
        });

        const canAutoSelect =
          selected.confidence === "high" || selected.confidence === "medium";
        const categoryExists = visibleCategories.some(
          (category) => category.name === selected.category,
        );

        if (canAutoSelect && categoryExists) {
          setForm((current) => ({
            ...current,
            category: selected.category,
            subCategory:
              selected.category === "Food"
                ? selected.subCategory || current.subCategory
                : null,
          }));
        }
      } catch (err) {
        if (active) {
          console.error("Failed to categorize transaction", err);
        }
      }
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    form.amount,
    form.date,
    form.note,
    form.type,
    isEdit,
    isOpen,
    userTouchedCategory,
    visibleCategories,
  ]);

  const valid = Number(form.amount) > 0 && form.category && form.date;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCategorySelect = (categoryName) => {
    setUserTouchedCategory(true);
    setCategorySuggestion(null);
    updateField("category", categoryName);
    if (categoryName !== "Food") {
      updateField("subCategory", null);
    }
    // Auto advance step on select
    handleNext();
  };

  const handleAmountChange = (event) => {
    const inputVal = event.target.value;
    const raw = inputVal.replace(/,/g, "").replace(/[^\d.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) return;
    updateField("amount", raw);
  };

  const formatCommas = (val) => {
    if (!val) return "";
    const parts = val.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const saveTransaction = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        date: toISOFromInputDate(form.date),
        subCategory: form.category === "Food" ? form.subCategory : null,
      };

      let result;
      if (isEdit) {
        result = await updateTransaction(transaction._id, payload);
      } else {
        result = await addTransaction(payload);
      }

      if (result) {
        const tx = result.transaction || result;
        if (result.healthTip) {
          addPopupToQueue({
            id: `temp_health_${tx._id || Date.now()}`,
            type: "health",
            ...result.healthTip
          });
        } else {
          triggerActionPopup("transaction_added", { transaction: tx });
        }
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event?.preventDefault();
    if (!valid) return;
    saveTransaction();
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteTransaction(transaction._id);
      setConfirmOpen(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Wizard Step triggers
  const handleNext = () => {
    if (step === 1 && Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (step === 2 && !form.category) {
      toast.error("Please select a category");
      return;
    }

    if (step < 3) {
      setDirection(1);
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  // Global keyboard shortcuts listeners inside the Modal
  useEffect(() => {
    const handleModalKeyDown = (e) => {
      if (!isOpen) return;

      // Shift+Enter (Quick Mode Save)
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        // Check minimum step 1 validity
        if (Number(form.amount) > 0) {
          // If no category picked yet, assign default first visible category
          let finalCategory = form.category;
          if (!finalCategory && visibleCategories.length > 0) {
            finalCategory = visibleCategories[0].name;
          }
          setForm((prev) => {
            const nextForm = { ...prev, category: finalCategory };
            setLoading(true);
            setTimeout(() => {
              const payload = {
                ...nextForm,
                amount: Number(nextForm.amount),
                date: toISOFromInputDate(nextForm.date),
              };
              addTransaction(payload).then((result) => {
                if (result) {
                  triggerActionPopup("transaction_added", { transaction: result.transaction || result });
                }
                setLoading(false);
                onClose();
              });
            }, 0);
            return nextForm;
          });
        }
      } else if (e.key === "Enter") {
        // Normal Enter -> Advances or Saves
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleModalKeyDown);
    return () => window.removeEventListener("keydown", handleModalKeyDown);
  }, [isOpen, step, form, visibleCategories]);

  // OCR scan complete
  const handleScanComplete = (scanResult) => {
    if (scanResult) {
      refresh();
      const { transaction: tx, healthTip, automations } = scanResult;
      if (healthTip) {
        addPopupToQueue({
          id: `temp_health_${tx._id || Date.now()}`,
          type: "health",
          ...healthTip
        });
      }
      if (automations && Array.isArray(automations)) {
        automations.forEach((pop) => addPopupToQueue(pop));
      }
      onClose();
    }
  };

  // Color theme variables
  const isIncome = form.type === "income";
  const accentColor = isIncome ? "var(--mint)" : "var(--flame)";
  const accentSoft = isIncome ? "var(--mint-soft)" : "var(--flame-soft)";
  const accentGlow = isIncome ? "var(--mint-glow)" : "var(--flame-glow)";

  // Animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? "Edit Transaction" : "New Transaction"}
      >
        <div
          className="space-y-5 transition-all duration-300 relative overflow-hidden min-h-[420px] flex flex-col justify-between"
          style={{
            "--form-accent": accentColor,
            "--form-accent-soft": accentSoft,
            "--form-accent-glow": accentGlow,
          }}
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pb-2 select-none">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={clsx(
                  "h-1.5 w-1.5 rounded-full transition-all duration-200",
                  s === step ? "w-5 bg-[var(--mint)]" : s < step ? "bg-[var(--mint-soft)]" : "bg-[var(--text-ghost)]"
                )}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {/* STEP 1: AMOUNT & TYPE */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={shouldReduceMotion ? { duration: 0.1 } : { type: "tween", duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Scan Receipt Button */}
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="w-full py-3 px-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all shadow-sm outline-none"
                    >
                      <Image className="h-4 w-4 text-[var(--mint)]" />
                      Scan Receipt / Bill
                    </button>
                  )}

                  {/* Type Toggles */}
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => updateField("type", "income")}
                      className={clsx(
                        "rounded-xl py-2.5 text-xs font-semibold transition-all outline-none",
                        isIncome
                          ? "bg-[var(--mint-soft)] text-[var(--mint)] border border-[var(--border-focus)] shadow-[var(--shadow-glow-mint)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("type", "expense")}
                      className={clsx(
                        "rounded-xl py-2.5 text-xs font-semibold transition-all outline-none",
                        !isIncome
                          ? "bg-[var(--flame-soft)] text-[var(--flame)] border border-[var(--flame)]/20 shadow-[var(--shadow-glow-flame)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      Expense
                    </button>
                  </div>

                  {/* Amount Hero input */}
                  <div className="text-center py-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="progressive-amount">
                      Amount
                    </label>
                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <span className="text-xl font-mono text-[var(--text-dim)]">₹</span>
                      <input
                        ref={amountInputRef}
                        id="progressive-amount"
                        value={formatCommas(form.amount)}
                        onChange={handleAmountChange}
                        inputMode="decimal"
                        autoComplete="off"
                        className="font-mono w-60 border-0 bg-transparent text-center text-4xl font-bold text-[var(--text-primary)] focus:ring-0 focus:outline-none p-0 select-text"
                        placeholder="0"
                      />
                    </div>
                    <div className="mx-auto w-40 mt-1 h-[2px] bg-[var(--border-default)] relative overflow-hidden rounded-full">
                      <div
                        className="absolute inset-0 transition-transform duration-300"
                        style={{
                          backgroundColor: accentColor,
                          transform: form.amount ? "translateX(0)" : "translateX(-100%)",
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CATEGORY SELECTION */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={shouldReduceMotion ? { duration: 0.1 } : { type: "tween", duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Step 1 recap */}
                  <div className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] px-4 py-2 text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      ₹{formatCommas(form.amount)} · <span className="capitalize">{form.type}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDirection(-1);
                        setStep(1);
                      }}
                      className="text-[10px] font-bold text-[var(--mint)] hover:underline flex items-center gap-0.5 outline-none"
                    >
                      Edit ✏️
                    </button>
                  </div>

                  {/* AI Categorization Alert */}
                  {categorySuggestion && !userTouchedCategory && (
                    <div className="rounded-xl border border-[rgba(99,228,181,0.2)] bg-[var(--mint-soft)] px-3 py-2 text-[10px] font-semibold text-[var(--mint)] animate-pulse flex items-center justify-between">
                      <span>✨ Auto-suggested category: {categorySuggestion.category}</span>
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(categorySuggestion.category)}
                        className="rounded-lg bg-[var(--mint)] text-[#05060B] px-2 py-0.5 font-bold"
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {/* Grid */}
                  <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[220px] pr-0.5 scrollbar-none">
                    {visibleCategories.map((category) => {
                      const isSelected = form.category === category.name;
                      return (
                        <button
                          key={category._id}
                          type="button"
                          onClick={() => handleCategorySelect(category.name)}
                          className={clsx(
                            "h-12 rounded-xl border flex flex-col items-center justify-center transition-all select-none hover:bg-[var(--bg-hover)] outline-none",
                            isSelected
                              ? "border-[var(--form-accent)] bg-[var(--form-accent-soft)]"
                              : "border-[var(--border-subtle)] bg-[var(--bg-base)]"
                          )}
                        >
                          <span className="text-base">
                            {category.icon || CATEGORY_EMOJIS[category.name] || "📌"}
                          </span>
                          <span className="text-[9px] font-bold text-[var(--text-primary)] mt-0.5 truncate max-w-full px-1">
                            {category.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Subcategory selection (Food only) */}
                  {form.category === "Food" && (
                    <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Subcategory (Optional)</p>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                        {subCategories.map((sub) => {
                          const isSelected = form.subCategory === sub.name;
                          return (
                            <button
                              key={sub._id}
                              type="button"
                              onClick={() => updateField("subCategory", isSelected ? null : sub.name)}
                              className={clsx(
                                "h-7 px-3 rounded-full border text-[10px] font-bold shrink-0 outline-none flex items-center gap-1",
                                isSelected
                                  ? "border-[var(--form-accent)] bg-[var(--form-accent-soft)]"
                                  : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              <span>{sub.icon || "🍽️"}</span>
                              <span>{sub.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: DETAILS (NOTE, DATE, RECURRING) */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={shouldReduceMotion ? { duration: 0.1 } : { type: "tween", duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Summary of Step 1 & 2 */}
                  <div className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] px-4 py-2 text-xs select-none">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      ₹{formatCommas(form.amount)} · <span className="capitalize">{form.type}</span> · {form.category}
                      {form.subCategory && ` (${form.subCategory})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDirection(-1);
                        setStep(2);
                      }}
                      className="text-[10px] font-bold text-[var(--mint)] hover:underline outline-none"
                    >
                      Edit ✏️
                    </button>
                  </div>

                  {/* Input details */}
                  <div className="space-y-3">
                    {/* Note Input */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Note</span>
                      <input
                        ref={noteInputRef}
                        type="text"
                        value={form.note}
                        onChange={(e) => updateField("note", e.target.value)}
                        placeholder="e.g. Starbucks coffee"
                        className="w-full h-11 mt-1 rounded-[10px] border border-[var(--input-border)] bg-[var(--input-bg)] text-xs text-[var(--text-primary)] px-3 focus:border-[var(--input-focus-border)] focus:outline-none"
                      />
                    </div>

                    {/* Date Input */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Date</span>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => updateField("date", e.target.value)}
                        className="w-full h-11 mt-1 rounded-[10px] border border-[var(--input-border)] bg-[var(--input-bg)] text-xs text-[var(--text-primary)] px-3 focus:border-[var(--input-focus-border)] focus:outline-none font-mono"
                      />
                    </div>

                    {/* Advanced parameters trigger */}
                    <div className="border-t border-[var(--border-subtle)] pt-2.5">
                      <button
                        type="button"
                        onClick={() => setAdvancedExpanded(!advancedExpanded)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] outline-none select-none"
                      >
                        <span>{advancedExpanded ? "▼" : "▶"} Advanced (Scanner / Autopilot)</span>
                      </button>

                      {advancedExpanded && (
                        <div className="mt-2.5 space-y-2.5 animate-in">
                          <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-3 border border-[var(--border-subtle)] text-xs select-none">
                            <span>Autopilot Recurring flag</span>
                            <input
                              type="checkbox"
                              className="rounded border-[var(--border-default)] text-[var(--mint)] focus:ring-[var(--mint)] h-4 w-4 outline-none"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Bar Bottom */}
          <div className="flex justify-between items-center gap-3 pt-3 border-t border-[var(--border-subtle)] select-none">
            {isEdit && step === 1 ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
                className="text-xs font-semibold text-[var(--flame)] hover:underline flex items-center gap-1 disabled:opacity-40 outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Transaction
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1}
                className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 outline-none"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={isIncome ? "primary" : "danger"}
                loading={loading}
                onClick={handleNext}
                className="text-xs"
              >
                {step === 3 ? (isEdit ? "Save Changes" : "Save ✓") : <span className="flex items-center gap-1">Next <ArrowRight className="h-3.5 w-3.5" /></span>}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete transaction?"
        message="This transaction will be permanently removed."
        confirmLabel="Delete"
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <ReceiptScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};

export default TransactionForm;
