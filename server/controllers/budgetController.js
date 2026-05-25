import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";

// Helper to get month range
const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

// PUT /api/budgets
// Set budget (upsert) for user + month + year
export const setBudget = asyncHandler(async (req, res) => {
  const { month, year, overall, categories } = req.body;

  const budget = await Budget.findOneAndUpdate(
    { user: req.user.id, month, year },
    {
      overall: overall || 0,
      categories: categories || [],
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    data: budget,
  });
});

// GET /api/budgets
// Find budget for user + month + year (defaults to current if not queried)
export const getBudget = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  let budget = await Budget.findOne({ user: req.user.id, month, year });

  if (!budget) {
    // Return a default empty budget object
    budget = {
      user: req.user.id,
      month,
      year,
      overall: 0,
      categories: [],
    };
  }

  res.status(200).json({
    success: true,
    data: budget,
  });
});

// GET /api/budgets/status
// Calculate budget usage percentage and status warnings
export const getBudgetStatus = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const { start, end } = getMonthRange(month, year);

  // 1. Get user's budget settings
  const budget = await Budget.findOne({ user: req.user.id, month, year });

  // 2. Aggregate actual spending for this month
  const actualSpending = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user.id),
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const overallSpent = actualSpending.reduce((sum, item) => sum + item.total, 0);

  const categorySpendingMap = actualSpending.reduce((acc, item) => {
    acc[item._id] = item.total;
    return acc;
  }, {});

  // 3. Compute Overall Budget Status
  const overallLimit = budget ? budget.overall : 0;
  const overallPercentage = overallLimit > 0 ? Math.round((overallSpent / overallLimit) * 100) : 0;
  let overallStatus = "safe";

  if (overallLimit > 0) {
    if (overallPercentage >= 100) overallStatus = "exceeded";
    else if (overallPercentage >= 90) overallStatus = "danger";
    else if (overallPercentage >= 70) overallStatus = "warning";
  }

  const overall = {
    limit: overallLimit,
    spent: overallSpent,
    percentage: overallPercentage,
    status: overallStatus,
  };

  // 4. Compute Category-wise Budget Status
  const categoriesList = budget ? budget.categories : [];
  const categories = categoriesList.map((c) => {
    const spent = categorySpendingMap[c.category] || 0;
    const limit = c.limit;
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    let status = "safe";

    if (limit > 0) {
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= 90) status = "danger";
      else if (percentage >= 70) status = "warning";
    }

    return {
      category: c.category,
      limit,
      spent,
      percentage,
      status,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      overall,
      categories,
    },
  });
});
