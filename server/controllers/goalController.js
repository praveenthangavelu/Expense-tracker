import asyncHandler from "../middleware/asyncHandler.js";
import SavingsGoal from "../models/SavingsGoal.js";
import {
  calculateGoalMetrics,
  checkMilestones,
  adjustGoalRecommendation,
  getGoalInsights,
} from "../services/goalService.js";

// Helper to attach metrics to goal objects
const formatGoalWithMetrics = (goal) => {
  const goalObj = goal.toObject ? goal.toObject() : goal;
  const metrics = calculateGoalMetrics(goalObj);
  return { ...goalObj, metrics };
};

export const getAll = asyncHandler(async (req, res) => {
  const { scope } = req.query;
  const query = {};

  if (scope === "family" && req.user.family) {
    query.family = req.user.family;
  } else {
    query.user = req.user.id;
  }

  const goals = await SavingsGoal.find(query);

  const formattedGoals = goals.map(formatGoalWithMetrics);

  // Sorting: active first (by priority high > medium > low, then targetDate asc), then completed, then others
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  formattedGoals.sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;

    if (a.status === "active" && b.status === "active") {
      const pA = priorityOrder[a.priority] ?? 1;
      const pB = priorityOrder[b.priority] ?? 1;
      if (pA !== pB) return pA - pB;
      return new Date(a.targetDate) - new Date(b.targetDate);
    }

    if (a.status === "completed" && b.status !== "completed") return -1;
    if (a.status !== "completed" && b.status === "completed") return 1;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.status(200).json({
    success: true,
    data: formattedGoals,
  });
});

export const create = asyncHandler(async (req, res) => {
  const {
    title,
    targetAmount,
    duration,
    icon,
    color,
    priority,
    autoDeduct,
    autoDeductFrequency,
    autoDeductAmount: inputAutoDeductAmount,
  } = req.body;

  const startDate = new Date();
  let targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();

  if (!req.body.targetDate) {
    if (duration === "1_month") targetDate.setDate(startDate.getDate() + 30);
    else if (duration === "3_months") targetDate.setDate(startDate.getDate() + 90);
    else if (duration === "6_months") targetDate.setDate(startDate.getDate() + 180);
    else if (duration === "1_year") targetDate.setDate(startDate.getDate() + 365);
    else if (duration === "2_years") targetDate.setDate(startDate.getDate() + 730);
  }

  const totalDays = Math.max(1, Math.round((targetDate - startDate) / (1000 * 60 * 60 * 24)));
  let autoDeductAmount = inputAutoDeductAmount || 0;

  if (autoDeduct && !inputAutoDeductAmount) {
    let frequencyDays = 30; // default monthly
    if (autoDeductFrequency === "daily") frequencyDays = 1;
    else if (autoDeductFrequency === "weekly") frequencyDays = 7;
    
    const intervals = Math.max(1, totalDays / frequencyDays);
    autoDeductAmount = Math.round(targetAmount / intervals);
  }

  const milestones = [
    { percent: 25, reached: false },
    { percent: 50, reached: false },
    { percent: 75, reached: false },
    { percent: 100, reached: false },
  ];

  const goal = await SavingsGoal.create({
    user: req.user.id,
    family: req.user.family || null,
    title,
    targetAmount,
    duration,
    startDate,
    targetDate,
    icon,
    color,
    priority,
    autoDeduct,
    autoDeductFrequency,
    autoDeductAmount,
    milestones,
    history: [],
  });

  res.status(201).json({
    success: true,
    data: formatGoalWithMetrics(goal),
  });
});

export const addSavings = asyncHandler(async (asyncReq, res) => {
  const { amount, note } = asyncReq.body;

  const goal = await SavingsGoal.findOne({ _id: asyncReq.params.id, user: asyncReq.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Goal not found" });
  }

  goal.savedAmount += amount;
  goal.history.push({
    date: new Date(),
    amount,
    type: "manual_add",
    note: note || "Savings added",
  });

  const milestone = checkMilestones(goal);

  if (goal.savedAmount >= goal.targetAmount) {
    goal.status = "completed";
    goal.completedAt = new Date();
  }

  await goal.save();

  res.status(200).json({
    success: true,
    data: formatGoalWithMetrics(goal),
    milestone,
  });
});

export const withdrawSavings = asyncHandler(async (asyncReq, res) => {
  const { amount, note } = asyncReq.body;

  const goal = await SavingsGoal.findOne({ _id: asyncReq.params.id, user: asyncReq.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Goal not found" });
  }

  if (amount > goal.savedAmount) {
    return res.status(400).json({ success: false, message: "Insufficient saved amount" });
  }

  goal.savedAmount -= amount;
  goal.history.push({
    date: new Date(),
    amount,
    type: "manual_withdraw",
    note: note || "Savings withdrawn",
  });

  // Re-evaluate status if completed
  if (goal.status === "completed" && goal.savedAmount < goal.targetAmount) {
    goal.status = "active";
    goal.completedAt = null;
  }

  // Reset milestones if withdrawn below percent
  const percentComplete = (goal.savedAmount / goal.targetAmount) * 100;
  goal.milestones.forEach((m) => {
    if (percentComplete < m.percent && m.reached) {
      m.reached = false;
      m.reachedAt = null;
    }
  });

  await goal.save();

  res.status(200).json({
    success: true,
    data: formatGoalWithMetrics(goal),
  });
});

export const update = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Goal not found" });
  }

  const {
    title,
    targetAmount,
    targetDate,
    priority,
    icon,
    color,
    autoDeduct,
    autoDeductFrequency,
    autoDeductAmount,
  } = req.body;

  if (title !== undefined) goal.title = title;
  if (priority !== undefined) goal.priority = priority;
  if (icon !== undefined) goal.icon = icon;
  if (color !== undefined) goal.color = color;

  let targetOrAmountChanged = false;
  if (targetAmount !== undefined && targetAmount !== goal.targetAmount) {
    goal.targetAmount = targetAmount;
    targetOrAmountChanged = true;
  }
  if (targetDate !== undefined && new Date(targetDate).getTime() !== new Date(goal.targetDate).getTime()) {
    goal.targetDate = new Date(targetDate);
    goal.duration = "custom";
    targetOrAmountChanged = true;
  }

  if (autoDeduct !== undefined) goal.autoDeduct = autoDeduct;
  if (autoDeductFrequency !== undefined) goal.autoDeductFrequency = autoDeductFrequency;

  if (autoDeductAmount !== undefined) {
    goal.autoDeductAmount = autoDeductAmount;
  } else if (targetOrAmountChanged && goal.autoDeduct) {
    // Recalculate autoDeductAmount
    const totalDays = Math.max(1, Math.round((new Date(goal.targetDate) - new Date(goal.startDate)) / (1000 * 60 * 60 * 24)));
    let frequencyDays = 30;
    if (goal.autoDeductFrequency === "daily") frequencyDays = 1;
    else if (goal.autoDeductFrequency === "weekly") frequencyDays = 7;
    
    const intervals = Math.max(1, totalDays / frequencyDays);
    goal.autoDeductAmount = Math.round(goal.targetAmount / intervals);
  }

  // Recheck milestones & completion status
  const percentComplete = (goal.savedAmount / goal.targetAmount) * 100;
  if (percentComplete >= 100 && goal.status !== "completed") {
    goal.status = "completed";
    goal.completedAt = new Date();
  } else if (percentComplete < 100 && goal.status === "completed") {
    goal.status = "active";
    goal.completedAt = null;
  }

  await goal.save();

  res.status(200).json({
    success: true,
    data: formatGoalWithMetrics(goal),
  });
});

export const pauseResume = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Goal not found" });
  }

  if (goal.status === "active") {
    goal.status = "paused";
  } else if (goal.status === "paused") {
    goal.status = "active";
  }

  await goal.save();

  res.status(200).json({
    success: true,
    data: formatGoalWithMetrics(goal),
  });
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Goal not found" });
  }

  goal.status = "cancelled";
  await goal.save();

  res.status(200).json({
    success: true,
    message: "Goal cancelled successfully",
  });
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await adjustGoalRecommendation(req.user.id);
  res.status(200).json({
    success: true,
    data: recommendations,
  });
});

export const getInsights = asyncHandler(async (req, res) => {
  const insights = await getGoalInsights(req.user.id);
  res.status(200).json({
    success: true,
    data: insights,
  });
});
