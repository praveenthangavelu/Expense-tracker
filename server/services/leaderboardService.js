import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import MonthlyPlan from "../models/MonthlyPlan.js";
import Family from "../models/Family.js";

/**
 * Get family leaderboard ranked by savings rate (percentage).
 * @param {string} userId - The requesting user
 * @param {string} period - "weekly" | "monthly" | "allTime"
 */
export const getFamilyLeaderboard = async (userId, period = "monthly") => {
  const user = await User.findById(userId).lean();
  if (!user?.family) {
    return { members: [], period, message: "Not in a family" };
  }

  const family = await Family.findById(user.family).lean();
  if (!family) {
    return { members: [], period, message: "Family not found" };
  }

  // Get all family members
  const members = await User.find({ family: user.family })
    .select("name email xp level streaks badges")
    .lean();

  const now = new Date();
  let dateRange = {};

  if (period === "weekly") {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    dateRange = { $gte: weekStart, $lte: now };
  } else if (period === "monthly") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateRange = { $gte: monthStart, $lte: now };
  }
  // allTime: no date filter

  const leaderboardEntries = [];

  for (const member of members) {
    const memberId = member._id;

    // Get income and expenses for the period
    const incomeFilter = { user: memberId, type: "income" };
    const expenseFilter = { user: memberId, type: "expense" };

    if (period !== "allTime") {
      incomeFilter.date = dateRange;
      expenseFilter.date = dateRange;
    }

    const [incomeAgg, expenseAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: incomeFilter },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpense = expenseAgg[0]?.total || 0;
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

    leaderboardEntries.push({
      userId: memberId,
      name: member.name,
      avatar: member.name ? member.name.slice(0, 2).toUpperCase() : "U",
      xp: member.xp || 0,
      level: member.level || 1,
      savingsRate: Math.max(0, savingsRate),
      totalSaved: Math.max(0, savings),
      totalIncome,
      totalExpense,
      loggingStreak: member.streaks?.logging?.current || 0,
      badgeCount: member.badges?.length || 0,
      isCurrentUser: memberId.toString() === userId.toString(),
    });
  }

  // Sort by savings rate (percentage), then by XP as tiebreaker
  leaderboardEntries.sort((a, b) => {
    if (b.savingsRate !== a.savingsRate) return b.savingsRate - a.savingsRate;
    return b.xp - a.xp;
  });

  // Assign ranks
  leaderboardEntries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return {
    familyName: family.name,
    period,
    members: leaderboardEntries,
    generatedAt: now,
  };
};

/**
 * Get XP leaderboard within family.
 */
export const getXPLeaderboard = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user?.family) {
    return { members: [], message: "Not in a family" };
  }

  const members = await User.find({ family: user.family })
    .select("name xp level badges streaks")
    .sort({ xp: -1 })
    .lean();

  return {
    type: "xp",
    members: members.map((m, index) => ({
      rank: index + 1,
      userId: m._id,
      name: m.name,
      avatar: m.name ? m.name.slice(0, 2).toUpperCase() : "U",
      xp: m.xp || 0,
      level: m.level || 1,
      badgeCount: m.badges?.length || 0,
      loggingStreak: m.streaks?.logging?.current || 0,
      isCurrentUser: m._id.toString() === userId.toString(),
    })),
  };
};
