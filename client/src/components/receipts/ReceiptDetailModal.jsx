import { useEffect, useState } from "react";
import { Trash2, ExternalLink, Calendar, Receipt, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../common/Modal";
import Button from "../common/Button";
import receiptService from "../../services/receiptService";

export const ReceiptDetailModal = ({ isOpen, onClose, receiptId, onDeleteSuccess }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const loadReceipt = async () => {
      if (!receiptId || !isOpen) return;
      setLoading(true);
      try {
        const res = await receiptService.getReceipt(receiptId);
        if (res.success) {
          setReceipt(res.data);
        }
      } catch (err) {
        toast.error("Failed to retrieve receipt details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadReceipt();
  }, [receiptId, isOpen, onClose]);

  const handleDeleteReceipt = async () => {
    if (!window.confirm("Are you sure you want to delete this receipt? This deletes the stored file permanently.")) return;

    setActionLoading(true);
    try {
      const res = await receiptService.deleteReceipt(receiptId);
      if (res.success) {
        toast.success("Receipt deleted");
        if (onDeleteSuccess) onDeleteSuccess(receiptId);
        onClose();
      }
    } catch (err) {
      toast.error("Failed to delete receipt");
    } finally {
      setActionLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const apiHost = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const getFullUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanHost = apiHost.endsWith("/api") ? apiHost.slice(0, -4) : apiHost;
    return `${cleanHost}/${path}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receipt ? `Receipt Detail — ${receipt.extractedData?.merchant?.value || "Shop"}` : "Receipt Detail"}
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center text-[var(--text-secondary)] text-sm font-semibold select-none animate-pulse">
          Loading receipt details...
        </div>
      ) : receipt ? (
        <div className="space-y-5">
          {/* Split layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Frame */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] h-64 overflow-hidden flex items-center justify-center relative group">
              {receipt.fileType === "application/pdf" ? (
                <div className="text-center p-4">
                  <FileText className="h-16 w-16 text-[var(--arctic)] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white truncate max-w-xs">{receipt.originalImage.split("/").pop()}</p>
                </div>
              ) : (
                <img
                  src={getFullUrl(receipt.originalImage)}
                  alt="Receipt source"
                  className="h-full w-full object-contain"
                />
              )}
              <a
                href={getFullUrl(receipt.originalImage)}
                target="_blank"
                rel="noreferrer"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-white/5 text-[var(--text-secondary)] hover:text-white transition duration-200"
                title="Open original file"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Extraction Data Table */}
            <div className="space-y-3 text-xs font-semibold">
              <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] p-3.5 space-y-2">
                <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 select-none text-[10px] uppercase text-[var(--text-secondary)]">
                  <span>Field</span>
                  <span>Parsed Value</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Merchant</span>
                  <span className="text-white">{receipt.extractedData?.merchant?.value || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Amount</span>
                  <span className="text-white font-mono">₹{receipt.extractedData?.amount?.value || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Date</span>
                  <span className="text-white">
                    {new Date(receipt.extractedData?.date?.value).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Category</span>
                  <span className="text-[var(--mint)] flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {receipt.extractedData?.category?.suggested || "Other"}
                  </span>
                </div>
                {receipt.extractedData?.receiptNumber?.value && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-dim)]">Invoice #</span>
                    <span className="text-white font-mono">{receipt.extractedData.receiptNumber.value}</span>
                  </div>
                )}
                {receipt.extractedData?.paymentMethod?.value && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-dim)]">Payment</span>
                    <span className="text-white capitalize">
                      {receipt.extractedData.paymentMethod.value.toLowerCase()} {receipt.extractedData.paymentMethod.details}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Linking Status</span>
                  {receipt.transaction ? (
                    <span className="text-[var(--mint)] font-bold">Linked to Transaction</span>
                  ) : (
                    <span className="text-[var(--solar)] font-bold">Unlinked (Scanned only)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line items list */}
          {receipt.extractedData?.lineItems && receipt.extractedData.lineItems.length > 0 && (
            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
              <h6 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Line Items Breakdown</h6>
              <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 scrollbar-none">
                {receipt.extractedData.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)] text-xs">
                    <span className="font-semibold text-white truncate pr-2">{item.name}</span>
                    <span className="font-mono text-[var(--text-secondary)] shrink-0">
                      {item.quantity} x ₹{item.unitPrice} = <span className="text-white font-bold">₹{item.totalPrice}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions footer */}
          <div className="flex gap-3 justify-between pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="ghost"
              type="button"
              onClick={handleDeleteReceipt}
              loading={actionLoading}
              className="text-[var(--flame)] hover:bg-[var(--flame-soft)] text-xs"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Permanently
            </Button>
            <Button variant="ghost" type="button" onClick={onClose} className="text-xs">
              Close details
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-[var(--text-secondary)]">Receipt details not found.</div>
      )}
    </Modal>
  );
};

export default ReceiptDetailModal;
