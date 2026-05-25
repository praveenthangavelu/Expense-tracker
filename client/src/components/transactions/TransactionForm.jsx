import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

import Button from "../common/Button";
import ConfirmDialog from "../common/ConfirmDialog";
import Modal from "../common/Modal";
import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { toInputDate, toISOFromInputDate } from "../../utils/formatDate";
import { subCategoryService } from "../../services/subCategoryService";

/* eslint-disable react-hooks/set-state-in-effect */

const emptyForm = {
  type: "expense",
  amount: "",
  category: "",
  subCategory: null,
  date: toInputDate(),
  note: "",
};

const TransactionForm = ({ isOpen, onClose, transaction }) => {
  const {
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const [form, setForm] = useState(emptyForm);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEdit = Boolean(transaction);

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
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount),
        category: transaction.category,
        subCategory: transaction.subCategory || null,
        date: toInputDate(transaction.date),
        note: transaction.note || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [transaction, isOpen]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  const valid = Number(form.amount) > 0 && form.category && form.date;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!valid) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        date: toISOFromInputDate(form.date),
        subCategory: form.category === "Food" ? form.subCategory : null,
      };

      if (isEdit) {
        await updateTransaction(transaction._id, payload);
      } else {
        await addTransaction(payload);
      }

      onClose();
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1">
            {["income", "expense"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField("type", type)}
                className={clsx(
                  "rounded-xl py-3 text-sm font-bold capitalize transition",
                  form.type === type
                    ? type === "income"
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-red-400 text-slate-950"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="text-center">
            <label className="text-sm text-slate-500" htmlFor="amount">
              Amount
            </label>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="amount text-3xl text-slate-500">₹</span>
              <input
                id="amount"
                value={form.amount}
                onChange={(event) =>
                  updateField("amount", event.target.value.replace(/[^\d.]/g, ""))
                }
                inputMode="decimal"
                className="amount w-48 border-0 bg-transparent text-center text-5xl font-bold text-white focus:ring-0"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-400">Category</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleCategories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => {
                    updateField("category", category.name);
                    if (category.name !== "Food") {
                      updateField("subCategory", null);
                    }
                  }}
                  className={clsx(
                    "rounded-2xl border p-3 text-left transition",
                    form.category === category.name
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  <span className="text-xl">
                    {category.icon || CATEGORY_EMOJIS[category.name] || "📌"}
                  </span>
                  <span className="ml-2 text-sm font-semibold text-white">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {form.category === "Food" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <p className="mb-3 text-sm font-semibold text-slate-400">
                  Food Sub-category <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </p>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 pr-2">
                  {subCategories.map((sub) => (
                    <button
                      key={sub._id}
                      type="button"
                      onClick={() =>
                        updateField(
                          "subCategory",
                          form.subCategory === sub.name ? null : sub.name
                        )
                      }
                      className={clsx(
                        "rounded-2xl border px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition duration-200",
                        form.subCategory === sub.name
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <span className="text-base">{sub.icon || "🍽️"}</span>
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-500">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
                className="mt-2 w-full rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-emerald-400 focus:ring-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-500">Note</span>
              <textarea
                value={form.note}
                maxLength={200}
                onChange={(event) => updateField("note", event.target.value)}
                className="mt-2 h-[42px] w-full resize-none rounded-2xl border-white/10 bg-white/[0.04] text-white focus:border-emerald-400 focus:ring-emerald-400"
                placeholder="Optional"
              />
              <span className="float-right mt-1 text-xs text-slate-600">
                {form.note.length}/200
              </span>
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-2">
            {isEdit ? (
              <Button
                variant="danger"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={loading} disabled={!valid}>
              {isEdit ? "Save Changes" : "Add Transaction"}
            </Button>
          </div>
        </form>
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
    </>
  );
};

export default TransactionForm;
