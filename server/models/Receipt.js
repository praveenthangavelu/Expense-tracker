import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    default: null,
  },
  originalImage: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: "",
  },
  preprocessedImage: {
    type: String,
    default: "",
  },
  fileType: {
    type: String,
    enum: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  ocrResult: {
    fullText: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },
  },
  extractedData: {
    amount: {
      value: { type: Number, default: 0 },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      rawText: { type: String, default: "" },
    },
    merchant: {
      value: { type: String, default: "" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      rawText: { type: String, default: "" },
      source: { type: String, default: "" },
      automated: { type: Boolean, default: false },
      matchedMerchant: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    date: {
      value: { type: Date, default: Date.now },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      rawText: { type: String, default: "" },
    },
    lineItems: [
      {
        name: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
        confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      },
    ],
    tax: {
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      type: { type: String, default: "" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
    },
    paymentMethod: {
      value: { type: String, default: "" },
      details: { type: String, default: "" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
    },
    receiptNumber: {
      value: { type: String, default: "" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
    },
    category: {
      suggested: { type: String, default: "Other" },
      subCategory: { type: String, default: "" },
      confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
      source: { type: String, default: "default" },
      alternatives: { type: mongoose.Schema.Types.Mixed, default: [] },
    },
    currency: { type: String, default: "INR" },
  },
  status: {
    type: String,
    enum: ["processing", "completed", "failed", "reviewed"],
    default: "processing",
  },
  userEdits: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  isDuplicate: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

receiptSchema.index({ user: 1, createdAt: -1 });
receiptSchema.index({ user: 1, "extractedData.receiptNumber.value": 1 });
receiptSchema.index({ transaction: 1 });

const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;
