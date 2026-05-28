import asyncHandler from "../middleware/asyncHandler.js";
import { getUserStats } from "../services/xpService.js";
import { getAllStreaks } from "../services/streakService.js";
import { getUserBadges, markBadgesSeen } from "../services/badgeService.js";
import { getFamilyLeaderboard, getXPLeaderboard } from "../services/leaderboardService.js";

/**
 * GET /api/gamification/profile
 * Returns comprehensive gamification profile for the user.
 */
export const getProfile = asyncHandler(async (req, res) => {
  const stats = await getUserStats(req.user.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/gamification/streaks
 * Returns all streak data for the user.
 */
export const getStreaks = asyncHandler(async (req, res) => {
  const streaks = await getAllStreaks(req.user.id);

  res.status(200).json({
    success: true,
    data: streaks,
  });
});

/**
 * GET /api/gamification/badges
 * Returns earned and unearned badges for the user.
 */
export const getBadges = asyncHandler(async (req, res) => {
  const badges = await getUserBadges(req.user.id);

  res.status(200).json({
    success: true,
    data: badges,
  });
});

/**
 * POST /api/gamification/badges/seen
 * Mark badges as seen (dismiss popups).
 * Body: { badgeIds: [string] }
 */
export const markSeen = asyncHandler(async (req, res) => {
  const { badgeIds } = req.body;
  if (!badgeIds || !Array.isArray(badgeIds)) {
    return res.status(400).json({ success: false, message: "badgeIds array required" });
  }

  await markBadgesSeen(req.user.id, badgeIds);

  res.status(200).json({
    success: true,
    message: "Badges marked as seen",
  });
});

/**
 * GET /api/gamification/leaderboard
 * Returns family leaderboard.
 * Query: ?period=weekly|monthly|allTime
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const period = req.query.period || "monthly";
  const leaderboard = await getFamilyLeaderboard(req.user.id, period);

  res.status(200).json({
    success: true,
    data: leaderboard,
  });
});

/**
 * GET /api/gamification/leaderboard/xp
 * Returns XP-based family leaderboard.
 */
export const getXPBoard = asyncHandler(async (req, res) => {
  const leaderboard = await getXPLeaderboard(req.user.id);

  res.status(200).json({
    success: true,
    data: leaderboard,
  });
});
