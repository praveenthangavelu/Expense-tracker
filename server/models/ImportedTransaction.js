import mongoose from "mongoose";

const importedTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  sourceDetail: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    required: true,
    enum: ["income", "expense"],
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  merchant: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  subCategory: {
    type: String,
    trim: true,
    default: null,
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  emailId: {
    type: String,
    required: true,
  },
  referenceId: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ["draft", "confirmed", "rejected"],
    default: "draft",
  },
  isPersonal: {
    type: Boolean,
    default: false,
  },
  isJunk: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
  },
  rawText: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to ensure we can check duplicates by emailId and user
importedTransactionSchema.index({ user: 1, emailId: 1 }, { unique: true });

// Index for listing drafts by status
importedTransactionSchema.index({ user: 1, status: 1, date: -1 });

const ImportedTransaction = mongoose.model("ImportedTransaction", importedTransactionSchema);

export default ImportedTransaction;
