import { useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import FilterBar from "../components/transactions/FilterBar";
import Pagination from "../components/transactions/Pagination";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";
import { useTransactions } from "../context/TransactionContext";
import usePopups from "../hooks/usePopups";
import ReceiptScanner from "../components/receipts/ReceiptScanner";
import ReceiptHistory from "../components/receipts/ReceiptHistory";
import ReceiptDetailModal from "../components/receipts/ReceiptDetailModal";

const Transactions = () => {
  const { pagination, setFilters, deleteTransaction, refresh } = useTransactions();
  const { addPopupToQueue } = usePopups();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Receipt Scanner & Detail modal states
  const [activeTab, setActiveTab] = useState("list"); // "list" | "receipts"
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (transaction) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteTransaction(deleting._id);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  };

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
    }
  };

  const handleViewReceipt = (receiptId) => {
    setSelectedReceiptId(receiptId);
    setDetailOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className="space-y-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight">
            Transactions
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium">Filter, edit, and review every entry.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setScannerOpen(true)} variant="ghost" className="border border-[var(--border-default)]">
            <span className="mr-1">📷</span>
            Scan Receipt
          </Button>
          <Button onClick={openCreate} variant="primary">
            <Plus className="h-4 w-4 mr-1 shrink-0" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-4 border-b border-[var(--border-subtle)] pb-px select-none">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-2 transition-all duration-200 cursor-pointer ${
            activeTab === "list"
              ? "border-[var(--electric)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setActiveTab("receipts")}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-2 transition-all duration-200 cursor-pointer ${
            activeTab === "receipts"
              ? "border-[var(--electric)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Scanned Receipts
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          <FilterBar />
          <TransactionList
            onEdit={openEdit}
            onDelete={setDeleting}
            onViewReceipt={handleViewReceipt}
          />
          <Pagination
            pagination={pagination}
            onPageChange={(page) => setFilters({ page })}
          />
        </>
      ) : (
        <ReceiptHistory />
      )}

      <TransactionForm
        isOpen={formOpen}
        transaction={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete transaction?"
        message="This transaction will be permanently removed."
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      <ReceiptScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />

      <ReceiptDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedReceiptId(null);
        }}
        receiptId={selectedReceiptId}
      />
    </motion.div>
  );
};

export default Transactions;
