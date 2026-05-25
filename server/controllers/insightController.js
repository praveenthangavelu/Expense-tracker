import asyncHandler from "../middleware/asyncHandler.js";
import Family from "../models/Family.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import {
  monthOverMonthComparison,
  topCategoryChange,
  biggestSpendingDay,
  weekdayVsWeekend,
  streakAnalysis,
  frequentMerchant,
  savingsRate,
  categoryAlert,
} from "../services/insightService.js";

// Helper for date ranges
const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

// GET /api/insights
// Individual Insights
export const getInsights = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const promises = [
    monthOverMonthComparison(req.user.id, month, year),
    topCategoryChange(req.user.id, month, year),
    biggestSpendingDay(req.user.id, month, year),
    weekdayVsWeekend(req.user.id, month, year),
    streakAnalysis(req.user.id),
    frequentMerchant(req.user.id, month, year),
    savingsRate(req.user.id, month, year),
    categoryAlert(req.user.id, month, year),
  ];

  const results = await Promise.all(promises);

  // Filter out null results (where there wasn't enough data to compute the insight)
  const insights = results.filter((insight) => insight !== null);

  res.status(200).json({
    success: true,
    data: insights,
  });
});

// GET /api/insights/family
// Family Insights (Admin Only)
export const getFamilyInsights = asyncHandler(async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const { start, end } = getMonthRange(month, year);
  const memberIds = family.members.map((m) => m.user);

  // Fetch users for name mapping
  const users = await User.find({ _id: { $in: memberIds } }).select("name");
  const userMap = users.reduce((acc, u) => {
    acc[u._id.toString()] = u.name;
    return acc;
  }, {});

  const insights = [];

  // 1. Group expenses by user to find Top Spender and Most Frugal
  const expenseAgg = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$user",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const expenseMap = expenseAgg.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.total;
    return acc;
  }, {});

  let topSpender = null;
  let maxExpense = -1;
  let mostFrugal = null;
  let minExpense = Infinity;

  users.forEach((u) => {
    const amt = expenseMap[u._id.toString()] || 0;
    if (amt > maxExpense) {
      maxExpense = amt;
      topSpender = u.name;
    }
    if (amt < minExpense) {
      minExpense = amt;
      mostFrugal = u.name;
    }
  });

  if (maxExpense > 0 && topSpender) {
    insights.push({
      type: "warning",
      emoji: "👑",
      title: "Top Spender",
      description: `${topSpender} spent the most this month, with a total of ₹${maxExpense}.`,
      data: { memberName: topSpender, amount: maxExpense },
    });
  }

  if (minExpense !== Infinity && mostFrugal) {
    insights.push({
      type: "achievement",
      emoji: "🛡️",
      title: "Most Frugal Member",
      description: `${mostFrugal} was the most frugal, spending only ₹${minExpense} this month.`,
      data: { memberName: mostFrugal, amount: minExpense },
    });
  }

  // 2. Family Combined Savings Rate
  const familyTotals = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const incomeTotal = familyTotals.find((item) => item._id === "income")?.total || 0;
  const expenseTotal = familyTotals.find((item) => item._id === "expense")?.total || 0;

  if (incomeTotal > 0) {
    const rate = Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100);
    if (rate >= 0) {
      insights.push({
        type: "positive",
        emoji: "👨‍👩‍👧‍👦",
        title: "Family Savings Rate",
        description: `The family saved ${rate}% of combined income this month.`,
        data: { savingsRate: rate, incomeTotal, expenseTotal },
      });
    } else {
      const overspent = expenseTotal - incomeTotal;
      insights.push({
        type: "warning",
        emoji: "🚨",
        title: "Family Savings Alert",
        description: `The family overspent by ₹${overspent} (spending exceeded combined income).`,
        data: { savingsRate: rate, incomeTotal, expenseTotal },
      });
    }
  }

  res.status(200).json({
    success: true,
    data: insights,
  });
});
