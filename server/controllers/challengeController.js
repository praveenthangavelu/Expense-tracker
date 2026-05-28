import asyncHandler from "../middleware/asyncHandler.js";
import {
  getActiveChallenges,
  getMyActiveChallenges,
  joinChallenge,
  getUserChallengeHistory,
  abandonChallenge,
} from "../services/challengeService.js";

/**
 * GET /api/challenges
 * Returns active challenges and user's progress on them.
 */
export const getAll = asyncHandler(async (req, res) => {
  const challenges = await getActiveChallenges(req.user.id);

  res.status(200).json({
    success: true,
    data: challenges,
  });
});

/**
 * GET /api/challenges/mine
 * Returns active challenges joined by the user.
 */
export const getMine = asyncHandler(async (req, res) => {
  const challenges = await getMyActiveChallenges(req.user.id);

  res.status(200).json({
    success: true,
    data: challenges,
  });
});

/**
 * POST /api/challenges/:id/join
 * Join a challenge.
 */
export const join = asyncHandler(async (req, res) => {
  const userChallenge = await joinChallenge(req.user.id, req.params.id);

  res.status(201).json({
    success: true,
    data: userChallenge,
  });
});

/**
 * GET /api/challenges/history
 * Returns user's challenge history (completed, failed, abandoned).
 */
export const getHistory = asyncHandler(async (req, res) => {
  const history = await getUserChallengeHistory(req.user.id);

  res.status(200).json({
    success: true,
    data: history,
  });
});

/**
 * POST /api/challenges/:id/abandon
 * Abandon an active challenge.
 */
export const abandon = asyncHandler(async (req, res) => {
  const result = await abandonChallenge(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});
