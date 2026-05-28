import asyncHandler from "../middleware/asyncHandler.js";
import * as healthService from "../services/healthService.js";

/**
 * GET /api/health/score
 * Fetch user health score for a given month and year
 */
export const getHealthScore = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const data = await healthService.getHealthScore(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data
  });
});

/**
 * GET /api/health/trend
 * Fetch junk food trend statistics
 */
export const getJunkFoodTrend = asyncHandler(async (req, res) => {
  const data = await healthService.getJunkFoodTrend(req.user.id);

  res.status(200).json({
    success: true,
    data
  });
});
