import asyncHandler from "../middleware/asyncHandler.js";
import MonthlyPlan from "../models/MonthlyPlan.js";
import {
  autoGeneratePlan,
  syncDailyProgress,
  runAutomationChecks,
  rebalanceBudget,
  generateWeeklyReport,
  generateMonthEndReport,
} from "../services/monthlyPlanService.js";
import { getDaysInMonth } from "date-fns";

export const getPlan = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const { autoCreate } = req.query;

  let plan = await MonthlyPlan.findOne({ user: req.user.id, month, year });

  if (!plan && autoCreate === "true") {
    const defaultData = await autoGeneratePlan(req.user.id, month, year);
    plan = await MonthlyPlan.create(defaultData);
  }

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: `Monthly plan for ${month}/${year} not found.`,
    });
  }

  // Sync latest transactions and progress
  const syncedPlan = await syncDailyProgress(req.user.id, month, year);
  // Run checks to see if warnings should fire
  const automations = await runAutomationChecks(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data: {
      plan: syncedPlan || plan,
      automations,
    },
  });
});

export const createPlan = asyncHandler(async (req, res) => {
  const { month, year, autoGenerate, plannedIncome = 0, plannedExpenses } = req.body;

  let existing = await MonthlyPlan.findOne({ user: req.user.id, month, year });
  if (existing) {
    await MonthlyPlan.deleteOne({ _id: existing._id });
  }

  let planData;
  if (autoGenerate) {
    planData = await autoGeneratePlan(req.user.id, month, year);
  } else {
    const finalExpenses = plannedExpenses || [];
    const totalBudget = finalExpenses.reduce((sum, c) => sum + c.budgetAmount, 0);
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const dailyBudget = Math.round(totalBudget / daysInMonth);
    const weeklyBudget = Math.round(totalBudget / 4);

    planData = {
      user: req.user.id,
      month,
      year,
      plannedIncome,
      plannedExpenses: finalExpenses,
      totalBudget,
      totalSpent: 0,
      dailyBudget,
      weeklyBudget,
      savingsTarget: plannedIncome - totalBudget,
      rules: [
        { type: "daily_limit", config: { limit: dailyBudget }, isActive: true },
        { type: "weekly_limit", config: { limit: weeklyBudget }, isActive: true },
      ],
      automations: [
        { trigger: "category_80", action: "popup", isActive: true },
        { trigger: "category_100", action: "popup", isActive: true },
        { trigger: "daily_exceeded", action: "popup", isActive: true },
        { trigger: "halfway_check", action: "popup", isActive: true },
        { trigger: "week_end_review", action: "popup", isActive: true },
      ],
      dailyLog: [],
      weeklyReview: [],
    };
  }

  const plan = await MonthlyPlan.create(planData);
  await syncDailyProgress(req.user.id, month, year);

  res.status(201).json({
    success: true,
    data: plan,
  });
});

export const updateBudget = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const { category, budgetAmount } = req.body;

  const plan = await MonthlyPlan.findOne({ user: req.user.id, month, year });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Monthly plan not found" });
  }

  const expEntry = plan.plannedExpenses.find((c) => c.category === category);
  if (expEntry) {
    expEntry.budgetAmount = budgetAmount;
  } else {
    plan.plannedExpenses.push({
      category,
      budgetAmount,
      spentAmount: 0,
      remaining: budgetAmount,
      percentage: 0,
      status: "safe",
    });
  }

  // Recalculate totals
  plan.totalBudget = plan.plannedExpenses.reduce((sum, c) => sum + c.budgetAmount, 0);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  plan.dailyBudget = Math.round(plan.totalBudget / daysInMonth);
  plan.weeklyBudget = Math.round(plan.totalBudget / 4);
  plan.savingsTarget = plan.plannedIncome - plan.totalBudget;

  await plan.save();
  const syncedPlan = await syncDailyProgress(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data: syncedPlan || plan,
  });
});

export const addRule = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const { type, config, isActive = true } = req.body;

  const plan = await MonthlyPlan.findOne({ user: req.user.id, month, year });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Monthly plan not found" });
  }

  // Check if rule type already exists
  const existingIndex = plan.rules.findIndex((r) => r.type === type);
  if (existingIndex > -1) {
    if (config !== undefined) {
      plan.rules[existingIndex].config = config;
    }
    plan.rules[existingIndex].isActive = isActive;
  } else {
    plan.rules.push({ type, config, isActive });
  }

  await plan.save();

  res.status(200).json({
    success: true,
    data: plan,
  });
});

export const rebalance = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const suggestions = await rebalanceBudget(req.user.id, month, year);
  res.status(200).json({
    success: true,
    data: suggestions,
  });
});

export const applyRebalance = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const { reallocations } = req.body;

  const plan = await MonthlyPlan.findOne({ user: req.user.id, month, year });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Monthly plan not found" });
  }

  reallocations.forEach((re) => {
    const fromCat = plan.plannedExpenses.find((c) => c.category === re.from);
    const toCat = plan.plannedExpenses.find((c) => c.category === re.to);

    if (fromCat && toCat) {
      fromCat.budgetAmount -= re.amount;
      toCat.budgetAmount += re.amount;
    }
  });

  await plan.save();
  const syncedPlan = await syncDailyProgress(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data: syncedPlan || plan,
  });
});

export const getWeeklyReportController = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const week = parseInt(req.query.week) || 1;

  const report = await generateWeeklyReport(req.user.id, month, year, week);
  if (!report) {
    return res.status(404).json({ success: false, message: "Weekly report not found" });
  }

  res.status(200).json({
    success: true,
    data: report,
  });
});

export const getMonthEndReportController = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() - 1 + 1; // Default to previous month if completed, or current
  const year = parseInt(req.query.year) || now.getFullYear();

  const report = await generateMonthEndReport(req.user.id, month, year);
  if (!report) {
    return res.status(404).json({ success: false, message: "Month-end report not found" });
  }

  res.status(200).json({
    success: true,
    data: report,
  });
});
