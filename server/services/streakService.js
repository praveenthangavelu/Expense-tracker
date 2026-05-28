import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import MonthlyPlan from "../models/MonthlyPlan.js";
import { classifyFood } from "../utils/foodClassifier.js";

// Helper: check if two dates represent the same calendar day in local time
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper: check if d1 is exactly the day before d2 in local time
const isYesterday = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  date1.setHours(0, 0, 0, 0);
  const date2 = new Date(d2);
  date2.setHours(0, 0, 0, 0);
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
};

// Helper: get start and end dates of today in local time
const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Updates the user's logging streak.
 */
export const updateLoggingStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date();
  const streaks = user.streaks || { logging: { current: 0, longest: 0, lastLogDate: null } };
  if (!user.streaks) user.streaks = streaks;

  const lastLog = streaks.logging.lastLogDate;
  let broken = false;
  let previousStreak = streaks.logging.current;

  if (lastLog && isSameDay(lastLog, today)) {
    // Already logged today, streak remains active, do nothing.
    return { streakType: "logging", current: streaks.logging.current, longest: streaks.logging.longest, broken: false };
  }

  if (!lastLog || isYesterday(lastLog, today)) {
    // New streak or continued from yesterday
    streaks.logging.current += 1;
    if (streaks.logging.current > streaks.logging.longest) {
      streaks.logging.longest = streaks.logging.current;
    }
  } else {
    // Gap larger than yesterday: streak broken!
    broken = streaks.logging.current > 0;
    streaks.logging.current = 1;
  }

  streaks.logging.lastLogDate = today;
  user.markModified("streaks");
  await user.save();

  return {
    streakType: "logging",
    current: streaks.logging.current,
    longest: streaks.logging.longest,
    broken,
    previousStreak: broken ? previousStreak : 0,
  };
};

/**
 * Updates the user's under budget streak.
 * Runs daily at midnight.
 */
export const updateUnderBudgetStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date();
  const streaks = user.streaks || {};
  if (!streaks.underBudget) {
    streaks.underBudget = { current: 0, longest: 0, lastCheckDate: null };
  }

  // Calculate today's total spending
  const { start, end } = getTodayBounds();
  const expenses = await Transaction.find({
    user: userId,
    type: "expense",
    date: { $gte: start, $lte: end },
  });
  const todaySpent = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Get daily budget
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const plan = await MonthlyPlan.findOne({ user: userId, month, year });
  const dailyBudget = plan?.dailyBudget || 1000; // fallback default limit

  let broken = false;
  let previousStreak = streaks.underBudget.current;

  if (todaySpent <= dailyBudget) {
    streaks.underBudget.current += 1;
    if (streaks.underBudget.current > streaks.underBudget.longest) {
      streaks.underBudget.longest = streaks.underBudget.current;
    }
  } else {
    broken = streaks.underBudget.current > 0;
    streaks.underBudget.current = 0;
  }

  streaks.underBudget.lastCheckDate = today;
  user.markModified("streaks");
  await user.save();

  return {
    streakType: "underBudget",
    current: streaks.underBudget.current,
    longest: streaks.underBudget.longest,
    broken,
    previousStreak: broken ? previousStreak : 0,
  };
};

/**
 * Updates the user's No Junk Food streak.
 * Runs daily at midnight.
 */
export const updateNoJunkFoodStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date();
  const streaks = user.streaks || {};
  if (!streaks.noJunkFood) {
    streaks.noJunkFood = { current: 0, longest: 0, lastCheckDate: null };
  }

  // Find all expenses in food category today
  const { start, end } = getTodayBounds();
  const foodExpenses = await Transaction.find({
    user: userId,
    type: "expense",
    category: "Food",
    date: { $gte: start, $lte: end },
  });

  const hadJunk = foodExpenses.some(
    (tx) => classifyFood(tx.subCategory, tx.note) === "junk"
  );

  let broken = false;
  let previousStreak = streaks.noJunkFood.current;

  if (!hadJunk) {
    streaks.noJunkFood.current += 1;
    if (streaks.noJunkFood.current > streaks.noJunkFood.longest) {
      streaks.noJunkFood.longest = streaks.noJunkFood.current;
    }
  } else {
    broken = streaks.noJunkFood.current > 0;
    streaks.noJunkFood.current = 0;
  }

  streaks.noJunkFood.lastCheckDate = today;
  user.markModified("streaks");
  await user.save();

  return {
    streakType: "noJunkFood",
    current: streaks.noJunkFood.current,
    longest: streaks.noJunkFood.longest,
    broken,
    previousStreak: broken ? previousStreak : 0,
  };
};

/**
 * Updates the user's No Spend streak.
 * Runs daily at midnight.
 */
export const updateNoSpendStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date();
  const streaks = user.streaks || {};
  if (!streaks.noSpend) {
    streaks.noSpend = { current: 0, longest: 0, lastNoSpendDate: null };
  }

  // Check if any expenses today
  const { start, end } = getTodayBounds();
  const hasExpenses = await Transaction.exists({
    user: userId,
    type: "expense",
    date: { $gte: start, $lte: end },
  });

  let broken = false;
  let previousStreak = streaks.noSpend.current;

  if (!hasExpenses) {
    streaks.noSpend.current += 1;
    if (streaks.noSpend.current > streaks.noSpend.longest) {
      streaks.noSpend.longest = streaks.noSpend.current;
    }
    streaks.noSpend.lastNoSpendDate = today;
  } else {
    broken = streaks.noSpend.current > 0;
    streaks.noSpend.current = 0;
  }

  user.markModified("streaks");
  await user.save();

  return {
    streakType: "noSpend",
    current: streaks.noSpend.current,
    longest: streaks.noSpend.longest,
    broken,
    previousStreak: broken ? previousStreak : 0,
  };
};

/**
 * Updates the user's savings goal contribution streak.
 */
export const updateSavingsStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const today = new Date();
  const streaks = user.streaks || {};
  if (!streaks.savingsGoal) {
    streaks.savingsGoal = { current: 0, longest: 0, lastAddDate: null };
  }

  const lastAdd = streaks.savingsGoal.lastAddDate;
  let broken = false;
  let previousStreak = streaks.savingsGoal.current;

  if (lastAdd && isSameDay(lastAdd, today)) {
    return { streakType: "savingsGoal", current: streaks.savingsGoal.current, longest: streaks.savingsGoal.longest, broken: false };
  }

  if (!lastAdd || isYesterday(lastAdd, today)) {
    streaks.savingsGoal.current += 1;
    if (streaks.savingsGoal.current > streaks.savingsGoal.longest) {
      streaks.savingsGoal.longest = streaks.savingsGoal.current;
    }
  } else {
    broken = streaks.savingsGoal.current > 0;
    streaks.savingsGoal.current = 1;
  }

  streaks.savingsGoal.lastAddDate = today;
  user.markModified("streaks");
  await user.save();

  return {
    streakType: "savingsGoal",
    current: streaks.savingsGoal.current,
    longest: streaks.savingsGoal.longest,
    broken,
    previousStreak: broken ? previousStreak : 0,
  };
};

/**
 * Returns all active streaks.
 */
export const getAllStreaks = async (userId) => {
  const user = await User.findById(userId).select("streaks").lean();
  return user?.streaks || {};
};

/**
 * Cron Job executed at 11:59 PM daily to sweep and update streaks for all active users.
 */
export const checkMidnightStreaks = async () => {
  const users = await User.find({});
  const today = new Date();
  const results = [];

  for (const user of users) {
    try {
      // 1. Run EOD Streaks
      const underBudgetRes = await updateUnderBudgetStreak(user._id);
      const noJunkRes = await updateNoJunkFoodStreak(user._id);
      const noSpendRes = await updateNoSpendStreak(user._id);

      // 2. Check if logging streak is broken at midnight (user didn't log anything today)
      if (user.streaks?.logging?.lastLogDate) {
        if (!isSameDay(user.streaks.logging.lastLogDate, today)) {
          // If the last log is older than today, they broke their logging streak today!
          user.streaks.logging.current = 0;
          user.markModified("streaks");
          await user.save();
        }
      }

      results.push({
        userId: user._id,
        name: user.name,
        underBudget: underBudgetRes.current,
        noJunk: noJunkRes.current,
        noSpend: noSpendRes.current,
      });
    } catch (err) {
      console.error(`Error checking midnight streaks for user ${user._id}:`, err.message);
    }
  }

  return {
    timestamp: today,
    usersProcessed: users.length,
    summary: results,
  };
};
