import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import receiptService from "../../services/receiptService";
import { useTransactions } from "../../context/TransactionContext";
import { CATEGORY_EMOJIS } from "../../utils/constants";
import { subCategoryService } from "../../services/subCategoryService";
import { toInputDate } from "../../utils/formatDate";

export const ReceiptScanner = ({ isOpen, onClose, onScanComplete }) => {
  const { categories } = useTransactions();
  const [step, setStep] = useState(1); // 1 = Upload, 2 = Review, 3 = Error
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Extracted/Editable states
  const [receiptId, setReceiptId] = useState(null);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [merchantDetection, setMerchantDetection] = useState(null);
  const [date, setDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Other");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [categoryDetection, setCategoryDetection] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [tax, setTax] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [currency, setCurrency] = useState("INR");

  // Accordions
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Subcategories cache
  const [subCategories, setSubCategories] = useState([]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load food subcategories
  useEffect(() => {
    const loadSubs = async () => {
      try {
        const res = await subCategoryService.getAll("Food");
        setSubCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load subcategories", err);
      }
    };
    if (isOpen) {
      loadSubs();
    }
  }, [isOpen]);

  // Clean up ObjectURL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Extract Expense categories
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  // Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else if (selectedFile.type === "application/pdf") {
      setPreviewUrl("pdf");
    } else {
      toast.error("Unsupported file type. Please upload an image or PDF.");
      return;
    }

    // Trigger Scan
    runOCR(selectedFile);
  };

  const runOCR = async (fileObj) => {
    setLoading(true);
    setStep(1);
    setProgressText("Uploading receipt...");

    const progressSteps = [
      { text: "Extracting text...", delay: 2000 },
      { text: "Parsing receipt structure...", delay: 4500 },
      { text: "Auto-detecting merchants & rates...", delay: 7500 },
      { text: "Almost done...", delay: 10000 },
    ];

    const timers = progressSteps.map((s) =>
      setTimeout(() => setProgressText(s.text), s.delay)
    );

    try {
      const res = await receiptService.scan(fileObj);
      timers.forEach(clearTimeout);

      if (res.success) {
        const {
          receiptId: id,
          extractedData: data,
          overallConfidence: conf,
          isDuplicate: dup,
        } = res.data;

        setReceiptId(id);
        setAmount(String(data.amount?.value || 0));
        setMerchant(data.merchant?.value || "");
        setMerchantDetection(data.merchant || null);
        setDate(toInputDate(data.date?.value || new Date()));
        setSelectedCategory(data.category?.suggested || "Other");
        setSelectedSubCategory(data.category?.subCategory || "");
        setCategoryDetection(data.category || null);
        setLineItems(data.lineItems || []);
        setTax(data.tax || null);
        setPaymentMethod(data.paymentMethod || null);
        setReceiptNumber(data.receiptNumber?.value || "");
        setIsDuplicate(dup);
        setOverallConfidence(conf);
        setCurrency(data.currency || "INR");

        setStep(2);
        toast.success("Receipt scanned successfully! 🎉");
      } else {
        setStep(3);
      }
    } catch (err) {
      timers.forEach(clearTimeout);
      console.error(err);
      setStep(3);
      toast.error(err.message || "Failed to scan receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!merchant.trim()) {
      toast.error("Please enter a merchant name");
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        type: "expense",
        amount: Number(amount),
        category: selectedCategory,
        subCategory: selectedCategory === "Food" ? selectedSubCategory || null : null,
        date: new Date(date).toISOString(),
        note: merchant.trim(),
      };

      const res = await receiptService.confirm(receiptId, transactionData);
      if (res.success) {
        toast.success("Transaction saved successfully! 🧾");
        // Trigger parent callback if defined
        if (onScanComplete) {
          onScanComplete(res.data);
        }
        resetScanner();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setStep(1);
    setFile(null);
    setPreviewUrl("");
    setReceiptId(null);
    setAmount("");
    setMerchant("");
    setMerchantDetection(null);
    setDate("");
    setSelectedCategory("Other");
    setSelectedSubCategory("");
    setCategoryDetection(null);
    setLineItems([]);
    setTax(null);
    setPaymentMethod(null);
    setReceiptNumber("");
    setIsDuplicate(false);
    setOverallConfidence(0);
    setZoomLevel(1);
  };

  const handleRetry = async () => {
    if (!receiptId) return;
    setLoading(true);
    setStep(1);
    setProgressText("Retrying OCR with alternative strategy...");
    try {
      const res = await receiptService.retryOCR(receiptId);
      if (res.success) {
        const { extractedData: data, isDuplicate: dup } = res.data;
        setAmount(String(data.amount?.value || 0));
        setMerchant(data.merchant?.value || "");
        setMerchantDetection(data.merchant || null);
        setDate(toInputDate(data.date?.value || new Date()));
        setSelectedCategory(data.category?.suggested || "Other");
        setSelectedSubCategory(data.category?.subCategory || "");
        setCategoryDetection(data.category || null);
        setLineItems(data.lineItems || []);
        setTax(data.tax || null);
        setPaymentMethod(data.paymentMethod || null);
        setReceiptNumber(data.receiptNumber?.value || "");
        setIsDuplicate(dup);
        setOverallConfidence(data.overallConfidence || 50);

        setStep(2);
        toast.success("OCR completed!");
      }
    } catch {
      setStep(3);
      toast.error("Retry failed");
    } finally {
      setLoading(false);
    }
  };

  // Line Item actions
  const handleUpdateItem = (idx, field, val) => {
    const copy = [...lineItems];
    copy[idx] = {
      ...copy[idx],
      [field]: val,
      totalPrice: field === "quantity" ? Number(val) * copy[idx].unitPrice : (field === "unitPrice" ? Number(val) * copy[idx].quantity : copy[idx].totalPrice),
    };
    setLineItems(copy);
  };

  const handleDeleteItem = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { name: "New Item", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  // Check items sum
  const itemsSum = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }, [lineItems]);

  const currencySymbol = useMemo(() => {
    const symbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
    return symbols[currency] || "₹";
  }, [currency]);

  const categoryConfidenceDot =
    categoryDetection?.confidence === "high"
      ? "🟢"
      : categoryDetection?.confidence === "medium"
        ? "🟡"
        : "🔴";
  const merchantConfidenceDot =
    !merchantDetection
      ? ""
      : merchantDetection.confidence === "high"
      ? "🟢"
      : merchantDetection.confidence === "medium"
        ? "🟡"
        : "🔴";
  const merchantConfidenceClass =
    merchantDetection?.confidence === "high"
      ? "border-[rgba(99,228,181,0.45)] focus-within:border-[var(--mint)] focus-within:shadow-[0_0_0_3px_var(--mint-soft)]"
      : merchantDetection?.confidence === "low"
        ? "border-[rgba(255,179,71,0.5)] focus-within:border-[var(--solar)] focus-within:shadow-[0_0_0_3px_var(--solar-soft)]"
        : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetScanner();
        onClose();
      }}
      title="Scan Receipt / Bill"
      size="wide"
    >
      <div className="min-h-[450px]">
        {/* ========================================================
            STEP 1: UPLOAD & PROCESSING
            ======================================================== */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center p-4">
            {!loading ? (
              <div className="w-full max-w-lg space-y-6">
                {/* Drag-n-drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer select-none ${
                    dragActive
                      ? "border-[var(--mint)] bg-[var(--mint-soft)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-base)] hover:border-white/20 hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <div className="text-center space-y-2">
                    <Upload className="h-10 w-10 text-[var(--text-dim)] mx-auto" />
                    <p className="text-sm font-semibold text-white">Drag & drop a receipt or bill</p>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">or tap to upload files</p>
                  </div>
                </div>

                {/* Buttons block */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Camera action (mobile rear camera) */}
                  <Button
                    variant="primary"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* Standard upload */}
                  <Button
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 border border-[var(--border-default)]"
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </Button>
                </div>
                <p className="text-[10px] text-center text-[var(--text-dim)] font-medium">
                  Supported formats: JPEG, PNG, WebP, PDF • Max 10MB
                </p>
              </div>
            ) : (
              /* Loading Scanner Sweep Screen */
              <div className="w-full max-w-sm text-center space-y-6 py-12">
                <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] flex items-center justify-center">
                  {previewUrl === "pdf" ? (
                    <FileText className="h-16 w-16 text-[var(--arctic)]" />
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover opacity-40 blur-[0.5px]" />
                  ) : (
                    <Upload className="h-12 w-12 text-[var(--text-dim)]" />
                  )}

                  {/* Red laser line sweep */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-[var(--mint)] shadow-[0_0_10px_var(--mint)]"
                    animate={{ y: ["0px", "160px"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: "easeInOut",
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[var(--electric)] animate-pulse" />
                    {progressText}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Local OCR Engine processing bill...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 2: REVIEW EXTRACTED DATA
            ======================================================== */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">
            {/* Left Column: Image Zoom View */}
            <div className="lg:col-span-5 flex flex-col justify-start space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Receipt Document Preview</span>
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-base)] h-96 flex items-center justify-center group">
                {previewUrl === "pdf" ? (
                  <div className="text-center p-8 space-y-3">
                    <FileText className="h-20 w-20 text-[var(--arctic)] mx-auto" />
                    <p className="text-xs font-semibold text-white">{file?.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Direct PDF Text Extracted Successfully</p>
                  </div>
                ) : (
                  <div className="relative h-full w-full overflow-auto flex items-center justify-center scrollbar-none">
                    <img
                      src={previewUrl}
                      alt="Extracted Receipt"
                      className="object-contain transition-all duration-300"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        maxHeight: "100%",
                      }}
                    />
                  </div>
                )}

                {/* Zoom controls */}
                {previewUrl !== "pdf" && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 rounded-lg p-1 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.25))}
                      className="px-2.5 py-1 text-xs font-mono font-bold text-white hover:bg-white/10 rounded"
                    >
                      -
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] px-1 font-mono">{zoomLevel}x</span>
                    <button
                      onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                      className="px-2.5 py-1 text-xs font-mono font-bold text-white hover:bg-white/10 rounded"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[9px] text-[var(--text-dim)] font-semibold select-none">
                Confidence Rating: <span className="font-mono text-white">{overallConfidence}%</span>
              </p>
            </div>

            {/* Right Column: Editable Fields */}
            <div className="lg:col-span-7 space-y-4">
              {/* Confidence Banner */}
              {overallConfidence >= 70 ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--mint-soft)] border border-[rgba(99,228,181,0.2)] px-4 py-3 text-xs text-[var(--mint)]">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">High confidence scan! Clean extraction detected.</span>
                </div>
              ) : overallConfidence >= 40 ? (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--solar-soft)] border border-[rgba(255,179,71,0.2)] px-4 py-3 text-xs text-[var(--solar)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Medium confidence scan. Please double check all amounts.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--flame-soft)] border border-[rgba(255,107,107,0.2)] px-4 py-3 text-xs text-[var(--flame)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Low confidence scan. Manual details verification recommended.</span>
                </div>
              )}

              {/* Duplicate warnings */}
              {isDuplicate && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/40 px-4 py-3 text-xs text-[var(--flame)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">⚠️ Duplicate Detected: This invoice may already be logged!</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Hero Amount Field */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 flex justify-between items-center gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Total Amount</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-[var(--text-dim)] font-mono">{currencySymbol}</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-transparent border-0 font-mono text-3xl font-bold text-white focus:ring-0 focus:outline-none w-48 p-0"
                      />
                    </div>
                  </div>
                  {tax && (
                    <div className="text-right text-[11px] font-mono text-[var(--text-secondary)] border-l border-[var(--border-subtle)] pl-4">
                      <p className="font-semibold text-white">Tax Detected</p>
                      <p>₹{tax.amount} ({tax.type} @{tax.percentage}%)</p>
                    </div>
                  )}
                </div>

                {/* Merchant Name */}
                <Input
                  label={`${merchantConfidenceDot ? `${merchantConfidenceDot} ` : ""}Merchant / Shop Name`}
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    setMerchantDetection(null);
                  }}
                  placeholder="e.g. Swiggy Restaurant"
                  className={merchantConfidenceClass}
                  required
                />
                {merchantDetection && (
                  <div
                    className={`-mt-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                      merchantDetection.confidence === "low"
                        ? "border-[rgba(255,179,71,0.22)] bg-[var(--solar-soft)] text-[var(--solar)]"
                        : "border-[rgba(99,228,181,0.18)] bg-[var(--mint-soft)] text-[var(--mint)]"
                    }`}
                  >
                    {merchantDetection.confidence === "low"
                      ? "Verify merchant name"
                      : `✨ Merchant auto-detected: ${merchantDetection.value}`}
                    {merchantDetection.matchedMerchant && (
                      <span className="ml-2 rounded-full bg-[rgba(99,228,181,0.14)] px-2 py-0.5 text-[10px] text-[var(--mint)]">
                        ✓ Known merchant
                      </span>
                    )}
                    <span className="text-[var(--text-secondary)]">
                      {" "}({merchantDetection.source || "OCR"})
                    </span>
                  </div>
                )}

                {/* Date Picker */}
                <Input
                  label="Bill Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />

                {categoryDetection && (
                  <div className="rounded-xl border border-[rgba(99,228,181,0.18)] bg-[var(--mint-soft)] px-4 py-3 text-xs font-semibold text-[var(--mint)]">
                    {categoryConfidenceDot} Category: {selectedCategory}
                    {selectedSubCategory ? ` → ${selectedSubCategory}` : ""}{" "}
                    <span className="text-[var(--text-secondary)]">
                      (detected from {merchant || "receipt"})
                    </span>
                  </div>
                )}

                {/* Category Grid Selection */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Category</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {expenseCategories.map((c) => {
                      const isSelected = selectedCategory === c.name;
                      return (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c.name);
                            if (c.name !== "Food") setSelectedSubCategory("");
                          }}
                          className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 select-none ${
                            isSelected
                              ? "border-[var(--electric)] bg-[var(--electric-soft)] text-white font-semibold"
                              : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]"
                          }`}
                        >
                          <span className="text-base">{c.icon || CATEGORY_EMOJIS[c.name] || "📌"}</span>
                          <span className="text-[9px] font-bold mt-0.5 truncate max-w-full px-1">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subcategory dropdown if Food */}
                {selectedCategory === "Food" && subCategories.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Food Type (Sub-category)</label>
                    <div className="mt-1 relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)]">
                      <select
                        value={selectedSubCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                        className="w-full rounded-lg border-0 bg-transparent py-2.5 px-3 text-xs text-white focus:ring-0 focus:outline-none cursor-pointer font-semibold"
                      >
                        <option value="">-- Choose Subcategory --</option>
                        {subCategories.map((sub) => (
                          <option key={sub._id} value={sub.name} className="bg-[var(--bg-surface)]">
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Collapsible Line Items Grid */}
                <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setItemsExpanded(!itemsExpanded)}
                    className="w-full px-4 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] flex justify-between items-center text-xs font-bold text-white transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-4 w-4 text-[var(--electric)]" />
                      Individual Items ({lineItems.length})
                    </span>
                    {itemsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {itemsExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-[var(--bg-base)] border-t border-[var(--border-subtle)]"
                      >
                        <div className="p-3 space-y-2.5 max-h-48 overflow-y-auto scrollbar-none">
                          {lineItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-subtle)] text-xs">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                                className="flex-grow bg-transparent border-0 text-white font-semibold focus:ring-0 focus:outline-none min-w-0"
                              />
                              <div className="flex gap-1.5 items-center shrink-0">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                                  className="w-10 bg-[var(--bg-base)] border border-white/5 text-center text-white rounded p-0.5"
                                  min="1"
                                />
                                <span className="text-[var(--text-dim)]">x</span>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateItem(idx, "unitPrice", e.target.value)}
                                  className="w-14 bg-[var(--bg-base)] border border-white/5 text-right text-white rounded p-0.5"
                                />
                                <span className="font-semibold text-white font-mono min-w-[50px] text-right">₹{item.totalPrice}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(idx)}
                                  className="text-[var(--flame)] hover:text-red-500 p-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {lineItems.length === 0 && (
                            <p className="text-[10px] text-[var(--text-dim)] text-center py-2">No individual items mapped.</p>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)] text-xs">
                            <button
                              type="button"
                              onClick={handleAddItem}
                              className="text-[var(--electric)] hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Item
                            </button>
                            <span className="font-semibold font-mono text-[var(--text-secondary)]">
                              Items Total: {currencySymbol}{itemsSum}
                            </span>
                          </div>

                          {itemsSum > 0 && Math.round(itemsSum) !== Math.round(Number(amount)) && (
                            <div className="flex items-center gap-1.5 text-[9px] text-[var(--solar)] font-bold bg-[var(--solar-soft)] p-2 rounded-lg border border-[rgba(255,179,71,0.15)] mt-2 leading-relaxed">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              Line items sum ({currencySymbol}{itemsSum}) does not match receipt total ({currencySymbol}{amount}).
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer details row */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-dim)] font-semibold select-none">
                  {paymentMethod && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-white">
                      <CreditCard className="h-3.5 w-3.5 text-[var(--arctic)]" />
                      Paid via {paymentMethod.value} {paymentMethod.details}
                    </span>
                  )}
                  {receiptNumber && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-white">
                      <Hash className="h-3.5 w-3.5 text-[var(--electric)]" />
                      Invoice #{receiptNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="ghost" type="button" onClick={resetScanner} className="text-xs">
                  Scan Again
                </Button>
                <Button variant="primary" type="button" onClick={handleSave} loading={loading} className="text-xs">
                  Save Transaction
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: ERROR STATE
            ======================================================== */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-6">
            <div className="rounded-full bg-red-950/20 p-4 border border-red-900/30 text-[var(--flame)]">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-headline text-lg font-bold text-white">Couldn't read this receipt 😕</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                The image might be too blurry, dark, shadow-covered, or contains handwriting. Let's try once more with high-definition settings or switch to manual entries.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button variant="primary" onClick={handleRetry} loading={loading}>
                Retry with High Contrast
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  resetScanner();
                  onClose();
                  // We can launch transaction form by emitting complete
                  if (onScanComplete) onScanComplete(null);
                }}
                className="border border-[var(--border-default)]"
              >
                Enter Manually
              </Button>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] p-3 text-left space-y-1.5 text-[10px] text-[var(--text-dim)] font-semibold w-full leading-normal">
              <p className="text-white text-xs font-bold mb-1">Tips for best OCR accuracy:</p>
              <p>🟢 Ensure bright, even lighting (no overhead shadows)</p>
              <p>🟢 Flatten the receipt paper (creases blur the text)</p>
              <p>🟢 Position camera directly above (avoid angled skewing)</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReceiptScanner;
