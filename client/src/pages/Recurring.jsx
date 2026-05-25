import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

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
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Repeat className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span>Recurring Transactions</span>
          </h2>
          <p className="text-slate-500 text-sm">Automate recurring invoices, salary, rent, and bills.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Recurring
        </Button>
      </div>

      {recurringList.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/5 space-y-4 max-w-[500px] mx-auto mt-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Repeat className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-white text-lg">No recurring templates yet</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Set up regular transactions like monthly rent, subscriptions, streaming services, or recurring salaries.
            </p>
          </div>
          <Button onClick={handleOpenAdd} variant="outline" className="mx-auto">
            Create First Template
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {recurringList.map((rt) => {
            const emoji = CATEGORY_EMOJIS[rt.category] || "📌";
            const amtColor = rt.type === "income" ? "text-emerald-400" : "text-red-400";
            
            return (
              <motion.div key={rt._id} variants={itemVariants}>
                <Card className={`relative border-t-4 ${rt.isActive ? (rt.type === "income" ? "border-t-emerald-400" : "border-t-red-400") : "border-t-slate-600 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl leading-none">{emoji}</div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                          {rt.category}
                          {rt.subCategory && (
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 font-semibold">
                              {rt.subCategory}
                            </span>
                          )}
                        </h4>
                        <span className="inline-block rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300 font-bold capitalize mt-1">
                          {rt.frequency}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(rt._id)}
                      className="text-slate-400 hover:text-white transition"
                      title={rt.isActive ? "Pause template" : "Resume template"}
                    >
                      {rt.isActive ? (
                        <ToggleRight className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className={`amount text-2xl font-bold ${amtColor}`}>
                      {rt.type === "income" ? "+" : "-"} {formatCurrency(rt.amount)}
                    </p>
                    {rt.note && (
                      <p className="text-xs text-slate-500 truncate mt-1 italic">
                        "{rt.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-white/[0.04] pt-3 text-xs text-slate-500 font-semibold mb-3">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Next due: {formatDateLabel(rt.nextDueDate)}</span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(rt)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
                      title="Edit template"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(rt._id)}
                      className="rounded-xl p-2 text-red-400 hover:bg-red-400/5 hover:text-red-300 transition"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
        title={isEdit ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1">
            {["income", "expense"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField("type", type)}
                className={`rounded-xl py-2 text-sm font-bold capitalize transition ${
                  form.type === type
                    ? type === "income"
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-red-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="0.00"
              required
            />
            <label className="block">
              <span className="text-sm text-slate-500">Frequency</span>
              <select
                value={form.frequency}
                onChange={(e) => updateField("frequency", e.target.value)}
                className="mt-2 w-full rounded-2xl border-white/10 bg-white/[0.04] text-white p-3 font-semibold focus:border-emerald-400 focus:ring-emerald-400"
              >
                {["daily", "weekly", "biweekly", "monthly", "yearly"].map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-400">Category</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleCategories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => {
                    updateField("category", cat.name);
                    if (cat.name !== "Food") {
                      updateField("subCategory", null);
                    }
                  }}
                  className={`rounded-2xl border p-3 text-left transition ${
                    form.category === cat.name
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <span className="text-lg">{cat.icon || CATEGORY_EMOJIS[cat.name] || "📌"}</span>
                  <span className="ml-2 text-xs font-semibold text-white">{cat.name}</span>
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
                      className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition ${
                        form.subCategory === sub.name
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                      }`}
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
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              required
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={form.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
            />
          </div>

          <Input
            label="Note"
            value={form.note}
            onChange={(e) => updateField("note", e.target.value)}
            placeholder="e.g. Netflix Subscription"
            maxLength={200}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading} disabled={!valid}>
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
    </div>
  );
};

export default RecurringPage;
