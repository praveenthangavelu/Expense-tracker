import { useState } from "react";
import { Plus } from "lucide-react";

import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import FilterBar from "../components/transactions/FilterBar";
import Pagination from "../components/transactions/Pagination";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";
import { useTransactions } from "../context/TransactionContext";

const Transactions = () => {
  const { pagination, setFilters, deleteTransaction } = useTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            Transactions
          </h2>
          <p className="text-slate-500">Filter, edit, and review every entry.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <FilterBar />
      <TransactionList onEdit={openEdit} onDelete={setDeleting} />
      <Pagination
        pagination={pagination}
        onPageChange={(page) => setFilters({ page })}
      />

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
    </div>
  );
};

export default Transactions;
