import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

// Helper for date ranges
const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

const getPreviousMonth = (month, year) => {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
};

// 1. Month over Month Comparison
export const monthOverMonthComparison = async (userId, month, year) => {
  const current = getMonthRange(month, year);
  const prev = getPreviousMonth(month, year);
  const previous = getMonthRange(prev.month, prev.year);

  const getExpenses = async (range) => {
    const res = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: "expense",
          date: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    return res[0]?.total || 0;
  };

  const currentTotal = await getExpenses(current);
  const previousTotal = await getExpenses(previous);

  if (previousTotal === 0) return null; // Not enough data for comparison

  const diff = currentTotal - previousTotal;
  const changePercent = Math.round((diff / previousTotal) * 100);
  const direction = diff >= 0 ? "up" : "down";

  const type = direction === "up" ? "warning" : "positive";
  const emoji = direction === "up" ? "📈" : "📉";
  const title = "Month-over-Month Spending";
  const description =
    direction === "up"
      ? `You spent ${changePercent}% more this month compared to last month.`
      : `You spent ${Math.abs(changePercent)}% less this month compared to last month.`;

  return {
    type,
    emoji,
    title,
    description,
    data: { currentMonth: currentTotal, previousMonth: previousTotal, changePercent, direction },
  };
};

// 2. Top Category Increase
export const topCategoryChange = async (userId, month, year) => {
  const current = getMonthRange(month, year);
  const prev = getPreviousMonth(month, year);
  const previous = getMonthRange(prev.month, prev.year);

  const getCategorySpending = async (range) => {
    const res = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: "expense",
          date: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);
    return res.reduce((acc, curr) => {
      acc[curr._id] = curr.total;
      return acc;
    }, {});
  };

  const currentCats = await getCategorySpending(current);
  const previousCats = await getCategorySpending(previous);

  let maxIncrease = 0;
  let targetCategory = null;
  let currentAmount = 0;
  let previousAmount = 0;

  for (const cat of Object.keys(currentCats)) {
    const prevAmt = previousCats[cat] || 0;
    const currAmt = currentCats[cat];
    const diff = currAmt - prevAmt;

    if (diff > maxIncrease && prevAmt > 0) {
      maxIncrease = diff;
      targetCategory = cat;
      currentAmount = currAmt;
      previousAmount = prevAmt;
    }
  }

  if (!targetCategory) return null;

  const changePercent = Math.round((maxIncrease / previousAmount) * 100);
  const title = `Increased Category Spending`;
  const description = `Your ${targetCategory} spending increased by ${changePercent}% — from ₹${previousAmount} to ₹${currentAmount}.`;
  
  return {
    type: "warning",
    emoji: "⚠️",
    title,
    description,
    data: { category: targetCategory, currentAmount, previousAmount, changePercent },
  };
};

// 3. Biggest Spending Day of Week
export const biggestSpendingDay = async (userId, month, year) => {
  const range = getMonthRange(month, year);
  const dayNames = [null, "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const res = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: "$date" },
        averageAmount: { $avg: "$amount" },
      },
    },
    {
      $sort: { averageAmount: -1 },
    },
    {
      $limit: 1,
    },
  ]);

  if (!res.length) return null;

  const dayOfWeek = res[0]._id;
  const averageAmount = Math.round(res[0].averageAmount);
  const dayName = dayNames[dayOfWeek];

  return {
    type: "neutral",
    emoji: "📅",
    title: "Biggest Spending Day",
    description: `You tend to spend the most on ${dayName}s — averaging ₹${averageAmount} per transaction.`,
    data: { dayName, averageAmount },
  };
};

// 4. Weekday vs Weekend Analysis
export const weekdayVsWeekend = async (userId, month, year) => {
  const range = getMonthRange(month, year);

  const res = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $project: {
        amount: 1,
        dayOfWeek: { $dayOfWeek: "$date" },
      },
    },
    {
      $project: {
        amount: 1,
        isWeekend: { $in: ["$dayOfWeek", [1, 7]] },
      },
    },
    {
      $group: {
        _id: "$isWeekend",
        total: { $sum: "$amount" },
        avg: { $avg: "$amount" },
      },
    },
  ]);

  if (res.length < 2) return null; // Needs both weekend and weekday transactions

  const weekend = res.find((item) => item._id === true) || { total: 0, avg: 0 };
  const weekday = res.find((item) => item._id === false) || { total: 0, avg: 0 };

  const weekendTotal = Math.round(weekend.total);
  const weekdayTotal = Math.round(weekday.total);
  const weekendAvg = Math.round(weekend.avg);
  const weekdayAvg = Math.round(weekday.avg);

  if (weekdayTotal === 0) return null;

  const diff = weekendTotal - weekdayTotal;
  const changePercent = Math.round((Math.abs(diff) / weekdayTotal) * 100);
  const direction = diff >= 0 ? "higher" : "lower";

  return {
    type: "neutral",
    emoji: "🍻",
    title: "Weekday vs Weekend",
    description: `Weekend spending (₹${weekendTotal}) is ${changePercent}% ${direction} than weekday spending (₹${weekdayTotal}).`,
    data: { weekendTotal, weekdayTotal, weekendAvg, weekdayAvg, changePercent, direction },
  };
};

// 5. Saving and Spending Streaks
export const streakAnalysis = async (userId) => {
  // Find expense dates in order
  const transactions = await Transaction.find({
    user: userId,
    type: "expense",
  })
    .sort({ date: 1 })
    .select("date");

  if (transactions.length < 3) return null;

  // Convert dates to YYYY-MM-DD unique sorted strings
  const dateStrings = [
    ...new Set(
      transactions.map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
      })
    ),
  ].sort();

  if (dateStrings.length === 0) return null;

  let maxSpendingStreak = 0;
  let currentSpendingStreak = 0;

  let maxSavingStreak = 0;
  let currentSavingStreak = 0;

  // Check streaks in between
  for (let i = 0; i < dateStrings.length; i++) {
    // Spending streak: consecutive days with expenses
    if (i === 0) {
      currentSpendingStreak = 1;
    } else {
      const prevDate = new Date(dateStrings[i - 1]);
      const currDate = new Date(dateStrings[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentSpendingStreak++;
      } else {
        maxSpendingStreak = Math.max(maxSpendingStreak, currentSpendingStreak);
        currentSpendingStreak = 1;

        // Saving streak: consecutive days with NO expenses (diffDays - 1 days)
        const gap = diffDays - 1;
        maxSavingStreak = Math.max(maxSavingStreak, gap);
      }
    }
  }

  maxSpendingStreak = Math.max(maxSpendingStreak, currentSpendingStreak);

  // If no-spend streak is 0, set to at least some days based on gaps
  if (maxSavingStreak === 0 && dateStrings.length > 1) {
    maxSavingStreak = 0;
  }

  // Choose which streak is more noteworthy
  if (maxSavingStreak >= 3) {
    return {
      type: "achievement",
      emoji: "🎉",
      title: "Saving Streak",
      description: `Your longest no-spend streak was ${maxSavingStreak} days! 🎉`,
      data: { savingStreak: maxSavingStreak, spendingStreak: maxSpendingStreak },
    };
  } else {
    return {
      type: "neutral",
      emoji: "💸",
      title: "Spending Streak",
      description: `You had expenses for ${maxSpendingStreak} days straight.`,
      data: { savingStreak: maxSavingStreak, spendingStreak: maxSpendingStreak },
    };
  }
};

// 6. Frequent Merchant
export const frequentMerchant = async (userId, month, year) => {
  const range = getMonthRange(month, year);

  const res = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        note: { $exists: true, $ne: "" },
        date: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: { $trim: { input: { $toLower: "$note" } } },
        originalNote: { $first: "$note" },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 1,
    },
  ]);

  if (!res.length || res[0].count < 2) return null; // Must visit at least twice to be frequent

  const note = res[0].originalNote;
  const count = res[0].count;
  const totalAmount = Math.round(res[0].totalAmount);

  return {
    type: "neutral",
    emoji: "🛒",
    title: "Frequent Merchant",
    description: `You visited '${note}' ${count} times, spending a total of ₹${totalAmount}.`,
    data: { note, count, totalAmount },
  };
};

// 7. Savings Rate
export const savingsRate = async (userId, month, year) => {
  const range = getMonthRange(month, year);

  const res = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const incomeTotal = res.find((item) => item._id === "income")?.total || 0;
  const expenseTotal = res.find((item) => item._id === "expense")?.total || 0;

  if (incomeTotal === 0) {
    if (expenseTotal > 0) {
      return {
        type: "warning",
        emoji: "🚨",
        title: "Monthly Savings Rate",
        description: `You overspent by ₹${expenseTotal} this month because you had no recorded income.`,
        data: { savingsRate: 0, incomeTotal, expenseTotal },
      };
    }
    return null;
  }

  const rate = Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100);

  if (rate >= 0) {
    return {
      type: "positive",
      emoji: "🐷",
      title: "Savings Rate",
      description: `You saved ${rate}% of your income this month.`,
      data: { savingsRate: rate, incomeTotal, expenseTotal },
    };
  } else {
    const overspent = expenseTotal - incomeTotal;
    return {
      type: "warning",
      emoji: "🚨",
      title: "Savings Rate Alert",
      description: `You overspent by ₹${overspent} this month (spending exceeds income).`,
      data: { savingsRate: rate, incomeTotal, expenseTotal },
    };
  }
};

// 8. Category Percentage Alert (> 30% of total expenses)
export const categoryAlert = async (userId, month, year) => {
  const range = getMonthRange(month, year);

  const res = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  if (!res.length) return null;

  const grandTotal = res.reduce((acc, curr) => acc + curr.total, 0);
  if (grandTotal === 0) return null;

  const topCategory = res[0]._id;
  const amount = Math.round(res[0].total);
  const percentage = Math.round((amount / grandTotal) * 100);

  if (percentage <= 30) return null;

  return {
    type: "warning",
    emoji: "💡",
    title: "High Category Expenditure",
    description: `${topCategory} takes up ${percentage}% of your total spending — consider reducing it.`,
    data: { category: topCategory, amount, percentage },
  };
};
