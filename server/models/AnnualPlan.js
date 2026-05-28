import mongoose from "mongoose";

const annualPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  annualIncome: {
    type: Number,
    default: 0,
  },
  annualExpense: {
    type: Number,
    default: 0,
  },
  annualSavings: {
    type: Number,
    default: 0,
  },
  months: [
    {
      month: { type: Number, required: true, min: 1, max: 12 },
      planned: {
        income: { type: Number, default: 0 },
        expenses: [
          {
            category: { type: String, required: true },
            amount: { type: Number, required: true, min: 0 },
            note: { type: String, default: "" },
          },
        ],
        totalExpense: { type: Number, default: 0 },
        savings: { type: Number, default: 0 },
      },
      actual: {
        income: { type: Number, default: 0 },
        totalExpense: { type: Number, default: 0 },
        savings: { type: Number, default: 0 },
      },
      variance: {
        income: { type: Number, default: 0 },
        expense: { type: Number, default: 0 },
        savings: { type: Number, default: 0 },
      },
      status: {
        type: String,
        enum: ["upcoming", "in_progress", "completed"],
        default: "upcoming",
      },
    },
  ],
  categories: [
    {
      category: { type: String, required: true },
      annualBudget: { type: Number, default: 0 },
      monthlyAvg: { type: Number, default: 0 },
    },
  ],
  goals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavingsGoal",
    },
  ],
  isAutoFilled: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

annualPlanSchema.index({ user: 1, year: 1 }, { unique: true });

const AnnualPlan = mongoose.model("AnnualPlan", annualPlanSchema);
export default AnnualPlan;
