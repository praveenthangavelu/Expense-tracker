import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
  category: {
    type: String,
    required: true,
    trim: true,
  },
  subCategory: {
    type: String,
    default: null,
    trim: true,
  },
  note: {
    type: String,
    maxlength: 500,
    trim: true,
    default: "",
  },
  frequency: {
    type: String,
    required: true,
    enum: ["daily", "weekly", "biweekly", "monthly", "yearly"],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    default: null,
  },
  nextDueDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastProcessed: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Cron job query: find active transactions that are due.
recurringTransactionSchema.index({ isActive: 1, nextDueDate: 1 });

// User's active recurring list query.
recurringTransactionSchema.index({ user: 1, isActive: 1 });

const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema
);

export default RecurringTransaction;
