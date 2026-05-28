// Import mongoose so we can define a schema and create a MongoDB model.
import mongoose from "mongoose";

// A schema describes the structure and validation rules for a MongoDB document.
const transactionSchema = new mongoose.Schema({
  // Link this transaction to the user who owns it.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    // Single-field index helps MongoDB quickly find transactions for one user.
    index: true,
  },

  // Store whether this transaction adds money or spends money.
  type: {
    type: String,
    required: true,
    // enum validation allows only these exact values.
    enum: ["income", "expense"],
  },

  // Store the transaction amount.
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },

  // Store the category name, such as Food, Salary, or Transport.
  category: {
    type: String,
    required: true,
    trim: true,
  },

  // Store an optional sub-category name (currently only for Food).
  subCategory: {
    type: String,
    trim: true,
    default: null,
  },

  // Store an optional note about this transaction.
  note: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },

  // Store the date the income or expense happened.
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // Link to scanned receipt if any
  receipt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Receipt",
    default: null,
  },

  // Store when this transaction record was created in the database.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES — every query pattern the app runs should hit an index.
// ─────────────────────────────────────────────────────────────────────────────

// Default list query: user's transactions ordered by newest first.
transactionSchema.index({ user: 1, date: -1 });

// Filtered by type (e.g., show only expenses).
transactionSchema.index({ user: 1, type: 1, date: -1 });

// Filtered by category (category reports, pie chart data).
transactionSchema.index({ user: 1, category: 1, date: -1 });

// Food subcategory breakdown queries.
transactionSchema.index({ user: 1, subCategory: 1, date: -1 });

// Category + subcategory combined breakdown.
transactionSchema.index({ user: 1, category: 1, subCategory: 1 });

// Compound index for summary aggregations that group by type and category.
transactionSchema.index({ user: 1, date: -1, type: 1, category: 1 });

// Most recent transactions for advisor and health score lookups.
transactionSchema.index({ user: 1, createdAt: -1 });

// Fast lookup of transaction by linked receipt
transactionSchema.index({ receipt: 1 });

// Create the Transaction model from the schema.
const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
