import AnnualPlan from "../models/AnnualPlan.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

export const autoFillPlan = async (userId, year) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 1. Fetch transactions of last 6 months
  const transactions = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
          category: "$category",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Compute average monthly income
  const incomeMonths = {};
  const categoryMonths = {};

  transactions.forEach((tx) => {
    const key = `${tx._id.year}-${tx._id.month}`;
    if (tx._id.type === "income") {
      incomeMonths[key] = (incomeMonths[key] || 0) + tx.total;
    } else {
      if (!categoryMonths[tx._id.category]) {
        categoryMonths[tx._id.category] = {};
      }
      categoryMonths[tx._id.category][key] = (categoryMonths[tx._id.category][key] || 0) + tx.total;
    }
  });

  const monthCount = Object.keys(incomeMonths).length || 1;
  const avgIncome = Object.values(incomeMonths).reduce((a, b) => a + b, 0) / monthCount || 50000;

  const categoryAverages = [];
  Object.entries(categoryMonths).forEach(([category, monthsMap]) => {
    const avg = Object.values(monthsMap).reduce((a, b) => a + b, 0) / (Object.keys(monthsMap).length || 1);
    categoryAverages.push({ category, amount: Math.round(avg) });
  });

  if (categoryAverages.length === 0) {
    categoryAverages.push({ category: "Food", amount: 8000 });
    categoryAverages.push({ category: "Shopping", amount: 5000 });
    categoryAverages.push({ category: "Rent", amount: 15000 });
  }

  const months = [];
  let totalPlannedIncome = 0;
  let totalPlannedExpense = 0;

  for (let m = 1; m <= 12; m++) {
    // Apply seasonal adjustments
    // Dec: +15% income (bonuses), +20% expenses (holidays/gifts)
    // Summer (June-July): +10% expenses (travel)
    let seasonalIncomeFactor = 1.0;
    let seasonalExpenseFactor = 1.0;

    if (m === 12) {
      seasonalIncomeFactor = 1.15;
      seasonalExpenseFactor = 1.2;
    } else if (m === 6 || m === 7) {
      seasonalExpenseFactor = 1.1;
    }

    const plannedIncome = Math.round(avgIncome * seasonalIncomeFactor);
    const plannedExpenses = categoryAverages.map((c) => ({
      category: c.category,
      amount: Math.round(c.amount * seasonalExpenseFactor),
      note: m === 12 ? "December holiday season adjustment" : (m === 6 || m === 7 ? "Summer seasonal adjustment" : ""),
    }));

    const totalExpense = plannedExpenses.reduce((sum, c) => sum + c.amount, 0);
    const plannedSavings = plannedIncome - totalExpense;

    totalPlannedIncome += plannedIncome;
    totalPlannedExpense += totalExpense;

    months.push({
      month: m,
      planned: {
        income: plannedIncome,
        expenses: plannedExpenses,
        totalExpense,
        savings: plannedSavings,
      },
      actual: { income: 0, totalExpense: 0, savings: 0 },
      variance: { income: 0, expense: 0, savings: 0 },
      status: "upcoming",
    });
  }

  const annualSavings = totalPlannedIncome - totalPlannedExpense;

  const categories = categoryAverages.map((c) => ({
    category: c.category,
    annualBudget: c.amount * 12,
    monthlyAvg: c.amount,
  }));

  return {
    user: userId,
    year,
    annualIncome: totalPlannedIncome,
    annualExpense: totalPlannedExpense,
    annualSavings,
    months,
    categories,
    isAutoFilled: true,
  };
};

export const syncActuals = async (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const transactions = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const actualIncome = transactions.find((t) => t._id === "income")?.total || 0;
  const actualExpense = transactions.find((t) => t._id === "expense")?.total || 0;
  const actualSavings = actualIncome - actualExpense;

  const now = new Date();
  let status = "upcoming";
  if (now.getFullYear() > year || (now.getFullYear() === year && now.getMonth() + 1 > month)) {
    status = "completed";
  } else if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    status = "in_progress";
  }

  return {
    actualIncome,
    actualExpense,
    actualSavings,
    status,
  };
};

export const syncAllActuals = async (userId, year) => {
  let plan = await AnnualPlan.findOne({ user: userId, year });
  if (!plan) return null;

  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 12;

  let totalActualIncome = 0;
  let totalActualExpense = 0;

  for (const m of plan.months) {
    // Only sync past and current months
    if (m.month <= currentMonth || year < now.getFullYear()) {
      const actuals = await syncActuals(userId, year, m.month);

      m.actual.income = actuals.actualIncome;
      m.actual.totalExpense = actuals.actualExpense;
      m.actual.savings = actuals.actualSavings;
      m.status = actuals.status;

      m.variance.income = m.actual.income - m.planned.income;
      m.variance.expense = m.actual.totalExpense - m.planned.totalExpense;
      m.variance.savings = m.actual.savings - m.planned.savings;

      totalActualIncome += m.actual.income;
      totalActualExpense += m.actual.totalExpense;
    }
  }

  // Update YTD properties if necessary, or let them reflect in analysis
  await plan.save();
  return plan;
};

export const getAnnualAnalysis = async (userId, year) => {
  const plan = await AnnualPlan.findOne({ user: userId, year });
  if (!plan) return null;

  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 12;

  let plannedIncomeYTD = 0;
  let actualIncomeYTD = 0;
  let plannedExpenseYTD = 0;
  let actualExpenseYTD = 0;
  let plannedSavingsYTD = 0;
  let actualSavingsYTD = 0;

  plan.months.forEach((m) => {
    if (m.month <= currentMonth) {
      plannedIncomeYTD += m.planned.income;
      actualIncomeYTD += m.actual.income;
      plannedExpenseYTD += m.planned.totalExpense;
      actualExpenseYTD += m.actual.totalExpense;
      plannedSavingsYTD += m.planned.savings;
      actualSavingsYTD += m.actual.savings;
    }
  });

  // Projection
  const monthsCompleted = currentMonth - (now.getFullYear() === year ? 1 : 0);
  const avgActualIncome = monthsCompleted > 0 ? actualIncomeYTD / monthsCompleted : actualIncomeYTD;
  const avgActualExpense = monthsCompleted > 0 ? actualExpenseYTD / monthsCompleted : actualExpenseYTD;

  const remainingMonths = 12 - currentMonth;
  const projectedIncome = actualIncomeYTD + (avgActualIncome * remainingMonths);
  const projectedExpense = actualExpenseYTD + (avgActualExpense * remainingMonths);
  const projectedSavings = projectedIncome - projectedExpense;

  // Category analysis
  const categorySpendYTD = {};
  const categoryBudgetYTD = {};

  // Initialize budgets
  plan.months.forEach((m) => {
    if (m.month <= currentMonth) {
      m.planned.expenses.forEach((e) => {
        categoryBudgetYTD[e.category] = (categoryBudgetYTD[e.category] || 0) + e.amount;
      });
    }
  });

  // Pull actual category breakdowns for YTD months
  const start = new Date(year, 0, 1);
  const end = new Date(year, currentMonth - 1, now.getDate(), 23, 59, 59);

  const actualsByCategory = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ]);

  actualsByCategory.forEach((c) => {
    categorySpendYTD[c._id] = c.total;
  });

  const categoryStatus = [];
  plan.categories.forEach((cat) => {
    const budget = categoryBudgetYTD[cat.category] || 0;
    const spent = categorySpendYTD[cat.category] || 0;
    const remaining = Math.max(0, cat.annualBudget - spent);
    const variance = spent - budget;
    
    let status = "On Track";
    if (variance > budget * 0.1) status = "Over Budget";
    else if (variance < -budget * 0.1) status = "Under Budget";

    categoryStatus.push({
      category: cat.category,
      annualBudget: cat.annualBudget,
      spentYTD: spent,
      remaining,
      monthlyAvg: Math.round(spent / Math.max(1, currentMonth)),
      status,
      variance,
    });
  });

  // Course correction adjustments
  let deficitCorrectionPerMonth = 0;
  if (actualSavingsYTD < plannedSavingsYTD && remainingMonths > 0) {
    const deficit = plannedSavingsYTD - actualSavingsYTD;
    deficitCorrectionPerMonth = Math.round(deficit / remainingMonths);
  }

  return {
    year,
    ytd: {
      income: { planned: plannedIncomeYTD, actual: actualIncomeYTD, variance: actualIncomeYTD - plannedIncomeYTD },
      expense: { planned: plannedExpenseYTD, actual: actualExpenseYTD, variance: actualExpenseYTD - plannedExpenseYTD },
      savings: { planned: plannedSavingsYTD, actual: actualSavingsYTD, variance: actualSavingsYTD - plannedSavingsYTD },
    },
    projected: {
      income: Math.round(projectedIncome),
      expense: Math.round(projectedExpense),
      savings: Math.round(projectedSavings),
      targetSavings: plan.annualSavings,
    },
    categories: categoryStatus,
    remainingMonths,
    deficitCorrectionPerMonth,
  };
};

export const getSmartRecommendations = async (userId, year) => {
  const plan = await AnnualPlan.findOne({ user: userId, year });
  if (!plan) return [];

  const analysis = await getAnnualAnalysis(userId, year);
  if (!analysis) return [];

  const recommendations = [];

  // Nudge 1: Overspending correction
  if (analysis.deficitCorrectionPerMonth > 0) {
    recommendations.push({
      id: "deficit_correction",
      emoji: "💡",
      title: "Annual Savings Course Correction",
      advice: `To hit your annual savings goal, reduce spending by ₹${analysis.deficitCorrectionPerMonth}/month for the remaining ${analysis.remainingMonths} months.`,
      impact: `Saves ₹${analysis.deficitCorrectionPerMonth * analysis.remainingMonths} by year end`,
    });
  }

  // Nudge 2: Category reallocation opportunities
  const underBudgetCats = analysis.categories.filter((c) => c.status === "Under Budget" && c.variance < -1000);
  const overBudgetCats = analysis.categories.filter((c) => c.status === "Over Budget" && c.variance > 1000);

  if (underBudgetCats.length > 0 && overBudgetCats.length > 0) {
    const source = underBudgetCats[0];
    const target = overBudgetCats[0];
    const amount = Math.min(Math.abs(source.variance), target.variance);
    const suggestedTransfer = Math.round(amount / analysis.remainingMonths);

    if (suggestedTransfer > 100) {
      recommendations.push({
        id: "reallocate_category",
        emoji: "🔄",
        title: "Budget Reallocation Opportunity",
        advice: `Your ${source.category} budget is consistently under. We suggest reallocating ₹${suggestedTransfer}/month from ${source.category} to ${target.category} where you overspend.`,
        impact: `Optimizes ₹${suggestedTransfer * analysis.remainingMonths} of remaining budget`,
      });
    }
  }

  // Nudge 3: Holiday spike warning
  const decMonth = plan.months.find((m) => m.month === 12);
  const decPlannedExpense = decMonth?.planned?.totalExpense || 0;
  if (decPlannedExpense > 0) {
    const avgExpense = plan.annualExpense / 12;
    const spike = decPlannedExpense - avgExpense;
    if (spike > 2000) {
      const now = new Date();
      const monthsUntilDec = 12 - (now.getMonth() + 1);
      if (monthsUntilDec > 0 && monthsUntilDec < 6) {
        const monthlySinkingFund = Math.round(spike / monthsUntilDec);
        recommendations.push({
          id: "holiday_spike",
          emoji: "🎄",
          title: "Holiday Seasonal Prep",
          advice: `December historically costs ₹${Math.round(spike)} more. Start setting aside ₹${monthlySinkingFund}/month from now as a sinking fund.`,
          impact: `Smooths out December budget shock`,
        });
      }
    }
  }

  // Nudge 4: Progress projection
  if (analysis.ytd.savings.actual > 0) {
    const pct = Math.round((analysis.projected.savings / plan.annualSavings) * 100);
    let color = "🟢";
    if (pct < 80) color = "🟡";
    if (pct < 50) color = "🔴";

    recommendations.push({
      id: "savings_progress",
      emoji: "📈",
      title: "Savings Trajectory",
      advice: `You've saved ₹${analysis.ytd.savings.actual} so far. At this rate, you'll hit ${pct}% of your annual savings goal (${color} ${pct}% of target).`,
      impact: `Projected year-end total: ₹${analysis.projected.savings}`,
    });
  }

  return recommendations;
};
