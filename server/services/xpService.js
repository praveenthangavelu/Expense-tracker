import User from "../models/User.js";
import { XP_AWARDS } from "../utils/xpConfig.js";
import { getLevel, getNextLevel, getXPProgress } from "../utils/levelConfig.js";
import UserChallenge from "../models/UserChallenge.js";

/**
 * Awards XP to a user and handles level-up logic.
 *
 * @param {string} userId - ID of the user
 * @param {string} action - Action key from XP_AWARDS
 * @param {object} [metadata] - Optional metadata
 * @returns {Promise<object|null>} - Level up results
 */
export const awardXP = async (userId, action, metadata = {}) => {
  const amount = XP_AWARDS[action];
  if (!amount || amount <= 0) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  const oldXP = user.xp || 0;
  const oldLevelConfig = getLevel(oldXP);
  const oldLevelNum = oldLevelConfig.level;

  user.xp = oldXP + amount;
  const newLevelConfig = getLevel(user.xp);
  const newLevelNum = newLevelConfig.level;

  let levelUp = false;
  if (newLevelNum > oldLevelNum) {
    user.level = newLevelNum;
    levelUp = true;
  }

  await user.save();

  return {
    xpAwarded: amount,
    totalXP: user.xp,
    levelUp,
    oldLevel: oldLevelNum,
    newLevel: newLevelNum,
    newTitle: newLevelConfig.title,
    newIcon: newLevelConfig.icon,
    newColor: newLevelConfig.color,
  };
};

/**
 * Gathers user statistics for the gamification engine.
 *
 * @param {string} userId - ID of the user
 * @returns {Promise<object>} - Comprehensive user stats
 */
export const getUserStats = async (userId) => {
  const user = await User.findById(userId)
    .populate({
      path: "badges.badge",
      model: "Badge",
    })
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const currentXP = user.xp || 0;
  const levelConfig = getLevel(currentXP);
  const nextLevelConfig = getNextLevel(currentXP);
  const progress = getXPProgress(currentXP);

  // Count active challenges
  const activeChallengesCount = await UserChallenge.countDocuments({
    user: userId,
    status: "active",
  });

  const earnedBadges = (user.badges || [])
    .filter((b) => b.badge)
    .map((b) => ({
      ...b.badge,
      earnedAt: b.earnedAt,
      seen: b.seen,
    }));

  return {
    user: {
      name: user.name,
      email: user.email,
      avatar: user.name ? user.name.slice(0, 2).toUpperCase() : "U",
    },
    xp: currentXP,
    level: levelConfig.level,
    levelTitle: levelConfig.title,
    levelIcon: levelConfig.icon,
    levelColor: levelConfig.color,
    nextLevel: nextLevelConfig
      ? {
          level: nextLevelConfig.level,
          title: nextLevelConfig.title,
          minXP: nextLevelConfig.minXP,
        }
      : null,
    xpProgress: progress,
    streaks: user.streaks || {},
    badges: {
      earnedCount: earnedBadges.length,
      earned: earnedBadges,
    },
    activeChallengesCount,
  };
};
