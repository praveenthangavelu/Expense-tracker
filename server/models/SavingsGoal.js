import mongoose from "mongoose";

const savingsGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Family",
    default: null,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 100,
  },
  savedAmount: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: "INR",
  },
  duration: {
    type: String,
    required: true,
    enum: ["1_month", "3_months", "6_months", "1_year", "2_years", "custom"],
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  icon: {
    type: String,
    default: "🎯",
  },
  color: {
    type: String,
    default: "#63E4B5",
  },
  priority: {
    type: String,
    enum: ["high", "medium", "low"],
    default: "medium",
  },
  autoDeduct: {
    type: Boolean,
    default: false,
  },
  autoDeductAmount: {
    type: Number,
    default: 0,
  },
  autoDeductFrequency: {
    type: String,
    enum: ["daily", "weekly", "monthly"],
    default: "monthly",
  },
  milestones: [
    {
      percent: { type: Number, required: true },
      reached: { type: Boolean, default: false },
      reachedAt: { type: Date, default: null },
    },
  ],
  status: {
    type: String,
    enum: ["active", "completed", "paused", "failed", "cancelled"],
    default: "active",
  },
  completedAt: {
    type: Date,
    default: null,
  },
  history: [
    {
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      type: {
        type: String,
        enum: ["manual_add", "auto_deduct", "manual_withdraw", "adjustment"],
        required: true,
      },
      note: { type: String, default: "" },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

savingsGoalSchema.index({ user: 1, status: 1 });
savingsGoalSchema.index({ family: 1, status: 1 });
savingsGoalSchema.index({ user: 1, targetDate: 1 });

const SavingsGoal = mongoose.model("SavingsGoal", savingsGoalSchema);
export default SavingsGoal;
