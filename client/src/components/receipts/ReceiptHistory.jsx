import { useEffect, useState } from "react";
import { Calendar, Receipt, Filter, FileText, CheckSquare, Square, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import Card from "../common/Card";
import Button from "../common/Button";
import receiptService from "../../services/receiptService";
import ReceiptDetailModal from "./ReceiptDetailModal";

export const ReceiptHistory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Multi-Select states
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Exit select mode when selections are cleared
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allCurrentSelected = receipts.every((r) => next.has(r._id));
      if (allCurrentSelected) {
        receipts.forEach((r) => next.delete(r._id));
      } else {
        receipts.forEach((r) => next.add(r._id));
      }
      return next;
    });
  };


  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the ${selectedIds.size} selected receipt(s)? This will permanently delete their scanned files.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => receiptService.deleteReceipt(id))
      );
      toast.success("Selected receipts deleted successfully");
      exitSelectMode();
      loadReceipts(page, filter);
    } catch {
      toast.error("Failed to delete some receipts");
      loadReceipts(page, filter);
    }
  };



  const loadReceipts = async (targetPage, targetFilter) => {
    setLoading(true);
    try {
      const res = await receiptService.getReceipts({
        page: targetPage,
        limit: 12,
        filter: targetFilter,
      });
      if (res.success) {
        setReceipts(res.data || []);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch {
      toast.error("Failed to load receipts list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReceipts(page, filter);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    exitSelectMode();
  };


  const handleCardClick = (receipt) => {
    setSelectedReceipt(receipt);
    setDetailOpen(true);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const apiHost = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const getFullUrl = (path) => {
    if (!path) return "";
    // If it is absolute URL already
    if (path.startsWith("http")) return path;
    const cleanHost = apiHost.endsWith("/api") ? apiHost.slice(0, -4) : apiHost;
    return `${cleanHost}/${path}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      {/* Filters Bar / Selection Toolbar */}
      {selectMode ? (
        /* ── Selection Mode Toolbar ── */
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--electric-soft)] rounded-2xl border border-[rgba(124,111,255,0.25)] p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exitSelectMode}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Exit selection mode"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold text-[var(--electric)] select-none">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-150 bg-white/10 hover:bg-white/20 text-white border border-transparent cursor-pointer"
            >
              {receipts.length > 0 && receipts.every((r) => selectedIds.has(r._id))
                ? <><Square className="h-3.5 w-3.5" /> Deselect All</>
                : <><CheckSquare className="h-3.5 w-3.5" /> Select All</>}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 bg-[var(--flame)] text-white hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </button>
          </div>
        </div>
      ) : (
        /* ── Normal Filter Bar ── */
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider select-none">
            <Filter className="h-3.5 w-3.5" />
            Filter receipts
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {["all", "linked", "unlinked"].map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition duration-150 ${
                    filter === f
                      ? "bg-[var(--electric-soft)] text-[var(--electric)] border border-[rgba(124,111,255,0.2)]"
                      : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-transparent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Select Mode Toggle */}
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition duration-150 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-[var(--border-default)] cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Select</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of Receipts */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-[var(--text-secondary)] text-sm font-semibold select-none animate-pulse">
          Loading receipt gallery...
        </div>
      ) : receipts.length === 0 ? (
        <Card className="p-12 text-center text-[var(--text-secondary)]">
          <Receipt className="h-12 w-12 text-[var(--text-dim)] mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No receipts found</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Uploaded and scanned bills will display in this list.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {receipts.map((r) => {
            const isLinked = r.transaction !== null;
            const amount = r.extractedData?.amount?.value || 0;
            const merchant = r.extractedData?.merchant?.value || "Unknown Shop";
            const dateStr = new Date(r.extractedData?.date?.value || r.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <Card
                key={r._id}
                className={`p-3 bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                  selectMode && selectedIds.has(r._id) ? "border-[var(--electric)] ring-1 ring-[var(--electric)]" : ""
                }`}
                onClick={() => selectMode ? handleToggleSelect(r._id) : handleCardClick(r)}
              >
                {/* Image Cover Preview */}
                <div className="relative aspect-[4/3] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden flex items-center justify-center">
                  {/* Selection Checkbox — always visible in select mode */}
                  <div
                    className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
                      selectMode || selectedIds.has(r._id)
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r._id)}
                      onChange={() => handleToggleSelect(r._id)}
                      className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--bg-base)] text-[var(--electric)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>

                  {r.fileType === "application/pdf" ? (
                    <FileText className="h-12 w-12 text-[var(--arctic)]" />
                  ) : r.thumbnail ? (
                    <img
                      src={getFullUrl(r.thumbnail)}
                      alt={merchant}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Receipt className="h-10 w-10 text-[var(--text-dim)]" />
                  )}

                  {/* Status Badge */}
                  <span
                    className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                      isLinked
                        ? "bg-[var(--mint-soft)] text-[var(--mint)] border-[rgba(99,228,181,0.2)]"
                        : "bg-[var(--solar-soft)] text-[var(--solar)] border-[rgba(255,179,71,0.2)]"
                    }`}
                  >
                    {isLinked ? "linked" : "unlinked"}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <h5 className="text-xs font-bold text-white truncate max-w-[70%]">{merchant}</h5>
                    <span className="text-xs font-bold font-mono text-white shrink-0">₹{amount}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-dim)] font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                    <span>{formatSize(r.fileSize)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4 select-none">
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => {
              setPage(page - 1);
              exitSelectMode();
            }}
            className="text-xs"
          >
            Prev
          </Button>
          <span className="text-xs text-[var(--text-secondary)] font-mono self-center">
            {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page === totalPages}
            onClick={() => {
              setPage(page + 1);
              exitSelectMode();
            }}
            className="text-xs"
          >
            Next
          </Button>
        </div>
      )}

      {/* ========================================================
          MODAL: RECEIPT FULL DETAIL
          ======================================================== */}
      <ReceiptDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedReceipt(null);
        }}
        receiptId={selectedReceipt?._id}
        onDeleteSuccess={() => {
          exitSelectMode();
          loadReceipts(page, filter);
        }}
      />
    </div>
  );
};

export default ReceiptHistory;
