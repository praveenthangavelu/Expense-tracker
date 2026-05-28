import asyncHandler from "../middleware/asyncHandler.js";
import AnnualPlan from "../models/AnnualPlan.js";
import SavingsGoal from "../models/SavingsGoal.js";
import {
  autoFillPlan,
  syncAllActuals,
  getAnnualAnalysis,
  getSmartRecommendations,
} from "../services/annualPlanService.js";
import { calculateGoalMetrics } from "../services/goalService.js";

export const getPlan = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const { autoCreate } = req.query;

  let plan = await AnnualPlan.findOne({ user: req.user.id, year });

  if (!plan && autoCreate === "true") {
    const defaultData = await autoFillPlan(req.user.id, year);
    plan = await AnnualPlan.create(defaultData);
  }

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: `Annual plan for year ${year} not found.`,
    });
  }

  // Sync actuals & fetch YTD summaries
  const syncedPlan = await syncAllActuals(req.user.id, year);
  const analysis = await getAnnualAnalysis(req.user.id, year);

  res.status(200).json({
    success: true,
    data: {
      plan: syncedPlan || plan,
      analysis,
    },
  });
});

export const createPlan = asyncHandler(async (req, res) => {
  const { year, autoFill, monthsData } = req.body;

  let existing = await AnnualPlan.findOne({ user: req.user.id, year });
  if (existing) {
    await AnnualPlan.deleteOne({ _id: existing._id });
  }

  let planData;
  if (autoFill) {
    planData = await autoFillPlan(req.user.id, year);
  } else {
    const finalMonthsData = monthsData || Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      planned: {
        income: 0,
        expenses: [],
        totalExpense: 0,
        savings: 0,
      },
      actual: { income: 0, totalExpense: 0, savings: 0 },
      variance: { income: 0, expense: 0, savings: 0 },
      status: "upcoming",
    }));

    let annualIncome = 0;
    let annualExpense = 0;

    finalMonthsData.forEach((m) => {
      annualIncome += m.planned.income || 0;
      annualExpense += m.planned.totalExpense || 0;
    });

    planData = {
      user: req.user.id,
      year,
      annualIncome,
      annualExpense,
      annualSavings: annualIncome - annualExpense,
      months: finalMonthsData,
      isAutoFilled: false,
    };
  }

  const plan = await AnnualPlan.create(planData);

  res.status(201).json({
    success: true,
    data: plan,
  });
});

export const updateMonth = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const monthNum = parseInt(req.params.month);

  const plan = await AnnualPlan.findOne({ user: req.user.id, year: targetYear });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Annual plan not found" });
  }

  const mEntry = plan.months.find((m) => m.month === monthNum);
  if (!mEntry) {
    return res.status(400).json({ success: false, message: "Invalid month number" });
  }

  const { plannedIncome, expenses } = req.body;
  mEntry.planned.income = plannedIncome;
  mEntry.planned.expenses = expenses;
  mEntry.planned.totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  mEntry.planned.savings = plannedIncome - mEntry.planned.totalExpense;

  // Recalculate annual totals
  let annualIncome = 0;
  let annualExpense = 0;
  plan.months.forEach((m) => {
    annualIncome += m.planned.income;
    annualExpense += m.planned.totalExpense;
  });

  plan.annualIncome = annualIncome;
  plan.annualExpense = annualExpense;
  plan.annualSavings = annualIncome - annualExpense;

  await plan.save();

  // Sync actuals
  await syncAllActuals(req.user.id, targetYear);
  const analysis = await getAnnualAnalysis(req.user.id, targetYear);

  res.status(200).json({
    success: true,
    data: { plan, analysis },
  });
});

export const updateCategoryBudget = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const { category, annualBudget } = req.body;

  const plan = await AnnualPlan.findOne({ user: req.user.id, year: targetYear });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Annual plan not found" });
  }

  const catEntry = plan.categories.find((c) => c.category === category);
  const monthlyAvg = Math.round(annualBudget / 12);

  if (catEntry) {
    catEntry.annualBudget = annualBudget;
    catEntry.monthlyAvg = monthlyAvg;
  } else {
    plan.categories.push({ category, annualBudget, monthlyAvg });
  }

  // Distribute the category budget across months planned values
  plan.months.forEach((m) => {
    const expEntry = m.planned.expenses.find((e) => e.category === category);
    if (expEntry) {
      expEntry.amount = monthlyAvg;
    } else {
      m.planned.expenses.push({ category, amount: monthlyAvg });
    }
    m.planned.totalExpense = m.planned.expenses.reduce((sum, e) => sum + e.amount, 0);
    m.planned.savings = m.planned.income - m.planned.totalExpense;
  });

  // Recalculate annual totals
  let annualIncome = 0;
  let annualExpense = 0;
  plan.months.forEach((m) => {
    annualIncome += m.planned.income;
    annualExpense += m.planned.totalExpense;
  });

  plan.annualIncome = annualIncome;
  plan.annualExpense = annualExpense;
  plan.annualSavings = annualIncome - annualExpense;

  await plan.save();

  await syncAllActuals(req.user.id, targetYear);
  const analysis = await getAnnualAnalysis(req.user.id, targetYear);

  res.status(200).json({
    success: true,
    data: { plan, analysis },
  });
});

export const syncActualsController = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const plan = await syncAllActuals(req.user.id, year);
  const analysis = await getAnnualAnalysis(req.user.id, year);

  res.status(200).json({
    success: true,
    data: { plan, analysis },
  });
});

export const getAnalysisController = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const analysis = await getAnnualAnalysis(req.user.id, year);

  res.status(200).json({
    success: true,
    data: analysis,
  });
});

export const getRecommendationsController = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const recommendations = await getSmartRecommendations(req.user.id, year);

  res.status(200).json({
    success: true,
    data: recommendations,
  });
});

export const linkGoal = asyncHandler(async (req, res) => {
  const { goalId, year } = req.body;
  const targetYear = parseInt(year) || new Date().getFullYear();

  const plan = await AnnualPlan.findOne({ user: req.user.id, year: targetYear });
  if (!plan) {
    return res.status(404).json({ success: false, message: "Annual plan not found" });
  }

  const goal = await SavingsGoal.findOne({ _id: goalId, user: req.user.id });
  if (!goal) {
    return res.status(404).json({ success: false, message: "Savings goal not found" });
  }

  // Push to goals if not already linked
  if (!plan.goals.includes(goalId)) {
    plan.goals.push(goalId);
  }

  // Factor in monthly required rate into remaining months' planned savings
  const metrics = calculateGoalMetrics(goal);
  const reqMonthly = metrics.requiredMonthlyRate;

  // Add this requirement to the planned budgets of the remaining months of the year
  const now = new Date();
  const currentMonth = now.getFullYear() === targetYear ? now.getMonth() + 1 : 1;

  plan.months.forEach((m) => {
    if (m.month >= currentMonth) {
      // Reduce planned expenses or keep expenses same but increase planned savings targets?
      // "Include goal's monthly requirement in the planned savings"
      m.planned.savings += reqMonthly;
      // Adjust total budget/income to support it or just increment savings target
    }
  });

  await plan.save();

  res.status(200).json({
    success: true,
    data: plan,
  });
});
