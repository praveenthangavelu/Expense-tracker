import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Clock,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import { recurringService } from "../services/recurringService";
import { useTransactions } from "../context/TransactionContext";
import { subCategoryService } from "../services/subCategoryService";
import { CATEGORY_EMOJIS } from "../utils/constants";
import { formatCurrency } from "../utils/formatCurrency";
import { toInputDate } from "../utils/formatDate";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

const emptyForm = {
  type: "expense",
  amount: "",
  category: "",
  subCategory: null,
  note: "",
  frequency: "monthly",
  startDate: toInputDate(),
  endDate: "",
};

export const RecurringPage = () => {
  const { categories } = useTransactions();
  const [recurringList, setRecurringList] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [recRes, subRes] = await Promise.all([
        recurringService.getAll(),
        subCategoryService.getAll("Food"),
      ]);
      setRecurringList(recRes.data || []);
      setSubCategories(subRes.data || []);
    } catch (err) {
      console.error("Failed to load recurring data", err);
      toast.error("Failed to load recurring transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isEdit = Boolean(editingId);
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type]
  );

  const valid = Number(form.amount) > 0 && form.category && form.startDate && form.frequency;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (rt) => {
    setForm({
      type: rt.type,
      amount: String(rt.amount),
      category: rt.category,
      subCategory: rt.subCategory || null,
      note: rt.note || "",
      frequency: rt.frequency,
      startDate: toInputDate(rt.startDate),
      endDate: rt.endDate ? toInputDate(rt.endDate) : "",
    });
    setEditingId(rt._id);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        subCategory: form.category === "Food" ? form.subCategory : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        startDate: new Date(form.startDate).toISOString(),
      };

      if (isEdit) {
        await recurringService.update(editingId, payload);
        toast.success("Recurring template updated");
      } else {
        await recurringService.create(payload);
        toast.success("Recurring template created");
      }
      setFormOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await recurringService.remove(deletingId);
      toast.success("Recurring template deleted");
      setDeletingId(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await recurringService.toggleActive(id);
      toast.success("Status updated");
      // Local update
      setRecurringList((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (err) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) return <Loader label="Loading recurring templates..." />;

  // Modal Accent colors
  const isIncome = form.type === "income";
  const modalAccentColor = isIncome ? "var(--mint)" : "var(--flame)";
  const modalAccentSoft = isIncome ? "var(--mint-soft)" : "var(--flame-soft)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className="space-y-6"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Repeat className="h-5 w-5 text-[var(--electric)]" />
            <span>Recurring Hub</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">Automate recurring invoices, salary, rent, and bills.</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="h-10">
          <Plus className="h-4 w-4 mr-1 shrink-0" />
          Add Template
        </Button>
      </div>

      {recurringList.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] p-12 text-center bg-[var(--bg-surface)] max-w-[480px] mx-auto mt-12 space-y-4 shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--electric-soft)] text-[var(--electric)] border border-[rgba(124,111,255,0.2)]">
            <Repeat className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-white text-base">No recurring schedules set</p>
            <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed">
              Create templates to automate regular transactions like streaming services, rent, utility bills, or monthly salaries.
            </p>
          </div>
          <Button onClick={handleOpenAdd} variant="ghost" className="mx-auto border border-[var(--border-default)]">
            Create First Template
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {recurringList.map((rt) => {
            const emoji = CATEGORY_EMOJIS[rt.category] || "📌";
            const isInc = rt.type === "income";
            const amtColor = isInc ? "text-[var(--mint)]" : "text-[var(--flame)]";
            const cardVariant = rt.isActive ? (isInc ? "glow-mint" : "glow-flame") : "default";

            return (
              <motion.div key={rt._id} variants={itemVariants}>
                <Card
                  variant={cardVariant}
                  className={clsx(
                    "relative overflow-hidden flex flex-col justify-between h-56",
                    !rt.isActive && "opacity-50 border-t-2 border-t-[var(--text-ghost)]"
                  )}
                  style={rt.isActive ? { borderTop: `2px solid ${isInc ? "var(--mint)" : "var(--flame)"}` } : undefined}
                >
                  <div>
                    {/* Header: emoji/title & Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-base)] text-base shrink-0 border border-[var(--border-subtle)] select-none">
                          {emoji}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-white flex items-center gap-1.5 truncate">
                            <span>{rt.category}</span>
                            {rt.subCategory && (
                              <span className="rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                                {rt.subCategory}
                              </span>
                            )}
                          </h4>
                          <span className="inline-flex rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] px-2 py-0.5 text-[9px] text-[var(--text-dim)] font-bold uppercase tracking-wider mt-1 select-none font-mono">
                            {rt.frequency}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActive(rt._id)}
                        className="text-[var(--text-dim)] hover:text-white transition cursor-pointer shrink-0"
                        title={rt.isActive ? "Pause template" : "Resume template"}
                      >
                        {rt.isActive ? (
                          <ToggleRight className="h-7 w-7 text-[var(--mint)]" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-[var(--text-ghost)]" />
                        )}
                      </button>
                    </div>

                    {/* Amount / Note */}
                    <div className="mt-4">
                      <p className={clsx("font-mono text-xl font-bold tracking-tight", amtColor)}>
                        {isInc ? "+" : "−"}{formatCurrency(rt.amount)}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-medium truncate mt-1 leading-normal">
                        {rt.note || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Footer metadata & buttons */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] font-semibold font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Next: {formatDateLabel(rt.nextDueDate)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(rt)}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--electric)] transition cursor-pointer"
                        title="Edit template"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(rt._id)}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--flame)] transition cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={isEdit ? "Edit Recurring schedule" : "New Recurring schedule"}
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          style={{
            "--form-accent": modalAccentColor,
            "--form-accent-soft": modalAccentSoft,
          }}
        >
          {/* Income/Expense Type Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--bg-base)] p-1.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                updateField("type", "income");
                updateField("category", "");
                updateField("subCategory", null);
              }}
              className={clsx(
                "rounded-lg py-2.5 text-xs font-semibold capitalize transition-all duration-200",
                isIncome
                  ? "bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.2)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              )}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                updateField("type", "expense");
                updateField("category", "");
                updateField("subCategory", null);
              }}
              className={clsx(
                "rounded-lg py-2.5 text-xs font-semibold capitalize transition-all duration-200",
                !isIncome
                  ? "bg-[var(--flame-soft)] text-[var(--flame)] border border-[rgba(255,107,107,0.2)]"
                  : "text-[var(--text-secondary)] hover:text-white"
              )}
            >
              Expense
            </button>
          </div>

          {/* Amount / Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="0.00"
              required
            />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Frequency</span>
              <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] focus-within:border-[var(--border-focus)] transition-all">
                <select
                  value={form.frequency}
                  onChange={(e) => updateField("frequency", e.target.value)}
                  className="w-full rounded-[10px] border-0 bg-transparent py-3 px-4 text-sm text-white focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {["daily", "weekly", "biweekly", "monthly", "yearly"].map((f) => (
                    <option key={f} value={f} className="bg-[var(--bg-surface)]">
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category selection */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {visibleCategories.map((cat) => {
                const isSelected = form.category === cat.name;
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      updateField("category", cat.name);
                      if (cat.name !== "Food") {
                        updateField("subCategory", null);
                      }
                    }}
                    className={clsx(
                      "h-12 rounded-[10px] border flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:bg-[var(--bg-hover)]",
                      isSelected
                        ? "border-[var(--form-accent)] bg-[var(--form-accent-soft)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-base)]"
                    )}
                  >
                    <span className="text-lg">{cat.icon || CATEGORY_EMOJIS[cat.name] || "📌"}</span>
                    <span className="text-[10px] font-semibold text-white mt-0.5 truncate max-w-full px-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Food Subcategory row */}
          <AnimatePresence initial={false}>
            {form.category === "Food" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                  Food Sub-category <span className="text-[10px] text-[var(--text-ghost)] font-normal normal-case">(Optional)</span>
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {subCategories.map((sub) => {
                    const isSelected = form.subCategory === sub.name;
                    return (
                      <button
                        key={sub._id}
                        type="button"
                        onClick={() =>
                          updateField(
                            "subCategory",
                            isSelected ? null : sub.name
                          )
                        }
                        className={clsx(
                          "h-9 rounded-full border px-4 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 shrink-0 snap-start select-none",
                          isSelected
                            ? "border-[var(--form-accent)] bg-[var(--form-accent-soft)] text-[var(--text-primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <span className="text-sm">{sub.icon || "🍽️"}</span>
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Start Date</span>
              <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] focus-within:border-[var(--border-focus)] transition-all">
                <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="w-full rounded-[10px] border-0 bg-transparent py-3 pl-11 pr-4 text-sm text-white focus:ring-0 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">End Date (Optional)</span>
              <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] focus-within:border-[var(--border-focus)] transition-all">
                <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full rounded-[10px] border-0 bg-transparent py-3 pl-11 pr-4 text-sm text-white focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <Input
            label="Note"
            value={form.note}
            onChange={(e) => updateField("note", e.target.value)}
            placeholder="e.g. Netflix Subscription"
            maxLength={200}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant={isIncome ? "primary" : "danger"} loading={actionLoading} disabled={!valid}>
              {isEdit ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="Delete recurring template?"
        message="This will prevent any future transactions from spawning automatically. Previously created transactions will not be deleted."
        confirmLabel="Delete"
        loading={actionLoading}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </motion.div>
  );
};

export default RecurringPage;
