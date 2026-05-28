import Badge from "../models/Badge.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import SavingsGoal from "../models/SavingsGoal.js";
import Receipt from "../models/Receipt.js";
import Family from "../models/Family.js";
import { awardXP } from "./xpService.js";

/**
 * Check a single badge condition against user data.
 * Returns true if the user qualifies for this badge.
 */
const evaluateCondition = async (condition, userId, userDoc) => {
  const { type, value } = condition;

  switch (type) {
    // ─── Milestone: Transaction count ──────────────────────────
    case "transaction_count": {
      const count = await Transaction.countDocuments({ user: userId });
      return count >= value;
    }

    // ─── Streak badges ─────────────────────────────────────────
    case "logging_streak":
      return (userDoc.streaks?.logging?.current || 0) >= value;

    case "under_budget_streak":
      return (userDoc.streaks?.underBudget?.current || 0) >= value;

    case "no_junk_streak":
      return (userDoc.streaks?.noJunkFood?.current || 0) >= value;

    case "zero_spend_day":
      return (userDoc.streaks?.noSpend?.current || 0) >= value;

    // ─── Budget badges ─────────────────────────────────────────
    case "budget_percentage_under": {
      // Checked during monthly report — use stored field if available
      // For now, check if under_budget streak >= 15 as proxy for 50%
      return (userDoc.streaks?.underBudget?.current || 0) >= 15;
    }

    // ─── Savings badges ────────────────────────────────────────
    case "goal_created": {
      const goalCount = await SavingsGoal.countDocuments({ user: userId });
      return goalCount >= value;
    }

    case "goal_completed": {
      const completedCount = await SavingsGoal.countDocuments({
        user: userId,
        status: "completed",
      });
      return completedCount >= value;
    }

    case "total_saved": {
      const goals = await SavingsGoal.find({ user: userId }).select("savedAmount").lean();
      const totalSaved = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
      return totalSaved >= value;
    }

    // ─── Scanner badges ────────────────────────────────────────
    case "receipts_scanned": {
      const receiptCount = await Receipt.countDocuments({ user: userId });
      return receiptCount >= value;
    }

    // ─── Social badges ─────────────────────────────────────────
    case "family_members": {
      if (!userDoc.family) return false;
      const family = await Family.findById(userDoc.family).lean();
      if (!family) return false;
      return (family.members?.length || 0) >= value;
    }

    case "family_under_budget_month":
      // Awarded by monthly cron job, not real-time check
      return false;

    // ─── Special / Time-based badges ───────────────────────────
    case "late_night_log": {
      const lateCount = await Transaction.countDocuments({
        user: userId,
        $expr: { $and: [{ $gte: [{ $hour: "$createdAt" }, 0] }, { $lt: [{ $hour: "$createdAt" }, 5] }] },
      });
      return lateCount >= value;
    }

    case "early_morning_log": {
      const earlyCount = await Transaction.countDocuments({
        user: userId,
        $expr: { $and: [{ $gte: [{ $hour: "$createdAt" }, 4] }, { $lt: [{ $hour: "$createdAt" }, 6] }] },
      });
      return earlyCount >= value;
    }

    // ─── Health score badge ────────────────────────────────────
    case "health_score":
      // Checked by healthService when score is computed
      return false;

    // ─── Streak recovery ───────────────────────────────────────
    case "streak_recovery":
      return (userDoc.streaks?.logging?.current || 0) >= value;

    default:
      return false;
  }
};

/**
 * Check all unearned badges for a user and award any that are now qualified.
 * Returns array of newly earned badges (with XP bonus info).
 */
export const checkAndAwardBadges = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];

  // Get IDs of already-earned badges
  const earnedBadgeIds = new Set(
    (user.badges || []).map((b) => b.badge.toString())
  );

  // Get all badge definitions from DB
  const allBadges = await Badge.find({}).lean();

  const newlyEarned = [];

  for (const badge of allBadges) {
    // Skip already-earned
    if (earnedBadgeIds.has(badge._id.toString())) continue;

    const qualified = await evaluateCondition(badge.condition, userId, user);
    if (!qualified) continue;

    // Award badge
    user.badges.push({
      badge: badge._id,
      earnedAt: new Date(),
      seen: false,
    });

    // Award bonus XP from badge
    let xpResult = null;
    if (badge.xpReward > 0) {
      // We add xpReward directly since awardXP uses action keys
      user.xp = (user.xp || 0) + badge.xpReward;
    }

    newlyEarned.push({
      badge: {
        _id: badge._id,
        key: badge.key,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        tier: badge.tier,
        xpReward: badge.xpReward,
        isSecret: badge.isSecret,
      },
      earnedAt: new Date(),
      xpAwarded: badge.xpReward,
    });
  }

  if (newlyEarned.length > 0) {
    user.markModified("badges");
    await user.save();
  }

  return newlyEarned;
};

/**
 * Get all badges: earned and unearned (excluding secrets the user hasn't earned).
 */
export const getUserBadges = async (userId) => {
  const user = await User.findById(userId)
    .populate({ path: "badges.badge", model: "Badge" })
    .lean();

  if (!user) throw new Error("User not found");

  const earnedMap = new Map();
  for (const b of user.badges || []) {
    if (b.badge) {
      earnedMap.set(b.badge._id.toString(), {
        ...b.badge,
        earnedAt: b.earnedAt,
        seen: b.seen,
        earned: true,
      });
    }
  }

  const allBadges = await Badge.find({}).lean();

  const result = {
    earned: [],
    unearned: [],
    totalCount: allBadges.length,
    earnedCount: earnedMap.size,
  };

  for (const badge of allBadges) {
    const id = badge._id.toString();
    if (earnedMap.has(id)) {
      result.earned.push(earnedMap.get(id));
    } else if (!badge.isSecret) {
      // Don't show secret badges until earned
      result.unearned.push({
        ...badge,
        earned: false,
      });
    }
  }

  // Sort earned by most recent first
  result.earned.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

  return result;
};

/**
 * Mark badges as seen (for popup dismissal).
 */
export const markBadgesSeen = async (userId, badgeIds) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let modified = false;
  for (const entry of user.badges) {
    if (badgeIds.includes(entry.badge.toString()) && !entry.seen) {
      entry.seen = true;
      modified = true;
    }
  }

  if (modified) {
    user.markModified("badges");
    await user.save();
  }

  return { success: true };
};
