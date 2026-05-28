import mongoose from "mongoose";

const monthlyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  plannedIncome: {
    type: Number,
    required: true,
  },
  plannedExpenses: [
    {
      category: { type: String, required: true },
      subcategory: { type: String, default: null },
      budgetAmount: { type: Number, required: true, min: 0 },
      spentAmount: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["safe", "warning", "danger", "exceeded"],
        default: "safe",
      },
      transactions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
        },
      ],
    },
  ],
  totalBudget: {
    type: Number,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  dailyBudget: {
    type: Number,
  },
  weeklyBudget: {
    type: Number,
  },
  savingsTarget: {
    type: Number,
  },
  rules: [
    {
      type: {
        type: String,
        enum: ["daily_limit", "category_cap", "no_spend_day", "weekly_limit"],
        required: true,
      },
      config: {
        type: mongoose.Schema.Types.Map,
        of: mongoose.Schema.Types.Mixed,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
  ],
  automations: [
    {
      trigger: {
        type: String,
        enum: [
          "category_80",
          "category_100",
          "daily_exceeded",
          "weekly_exceeded",
          "halfway_check",
          "week_end_review",
        ],
        required: true,
      },
      action: {
        type: String,
        enum: ["popup", "email", "freeze_suggestion", "rebalance"],
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
  ],
  dailyLog: [
    {
      date: { type: Date, required: true },
      spent: { type: Number, default: 0 },
      budgetForDay: { type: Number, required: true },
      underOver: { type: Number, default: 0 },
      note: { type: String, default: "" },
    },
  ],
  weeklyReview: [
    {
      weekNumber: { type: Number, required: true },
      totalSpent: { type: Number, default: 0 },
      budgetForWeek: { type: Number, default: 0 },
      bestDay: {
        date: { type: Date },
        amount: { type: Number },
      },
      worstDay: {
        date: { type: Date },
        amount: { type: Number },
      },
      insight: { type: String, default: "" },
    },
  ],
  status: {
    type: String,
    enum: ["planning", "active", "completed"],
    default: "planning",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

monthlyPlanSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

const MonthlyPlan = mongoose.model("MonthlyPlan", monthlyPlanSchema);
export default MonthlyPlan;
