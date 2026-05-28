import asyncHandler from "../middleware/asyncHandler.js";
import * as advisorService from "../services/advisorService.js";
import User from "../models/User.js";
import Family from "../models/Family.js";

/**
 * GET /api/advisor/full
 * Fetch full 7-point spending analysis
 */
export const getFullAnalysis = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const data = await advisorService.analyzeSpending(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data
  });
});

/**
 * GET /api/advisor/quick
 * Fetch lightweight quick advice summary for dashboard
 */
export const getQuickAdvice = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const full = await advisorService.analyzeSpending(req.user.id, month, year);

  res.status(200).json({
    success: true,
    data: {
      overspending: full.overspending,
      spendingVelocity: full.spendingVelocity,
      summary: full.summary
    }
  });
});

/**
 * GET /api/advisor/family
 * Fetch comparative analysis for each family member (Admin only)
 */
export const getFamilyAnalysis = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  if (!req.user.family) {
    return res.status(400).json({
      success: false,
      message: "You are not member of any family"
    });
  }

  // Find all family members
  const members = await User.find({ family: req.user.family });

  // Run advisor analysis for each family member
  const memberAnalyses = await Promise.all(
    members.map(async (m) => {
      const analysis = await advisorService.analyzeSpending(m._id, month, year);
      return {
        userId: m._id,
        name: m.name,
        email: m.email,
        summary: analysis.summary
      };
    })
  );

  // Generate comparative insights
  const comparativeInsights = [];

  if (memberAnalyses.length >= 2) {
    // Sort by savings score (higher score is better)
    const sortedByScore = [...memberAnalyses].sort((a, b) => b.summary.score - a.summary.score);
    const topSaver = sortedByScore[0];
    const bottomSaver = sortedByScore[sortedByScore.length - 1];

    if (topSaver.summary.score > bottomSaver.summary.score + 10) {
      comparativeInsights.push(
        `${topSaver.name} (Grade: ${topSaver.summary.grade}) is currently demonstrating stronger savings discipline compared to ${bottomSaver.name} (Grade: ${bottomSaver.summary.grade}) this month.`
      );
    } else {
      comparativeInsights.push(
        "All family members are maintaining a similar financial health pace this month. Keep it up!"
      );
    }

    // Custom recommendation for the family overall
    const lowPerformers = sortedByScore.filter(m => m.summary.score < 60);
    if (lowPerformers.length > 0) {
      const names = lowPerformers.map(m => m.name).join(", ");
      comparativeInsights.push(
        `Nudge alert: ${names} have room to optimize savings rates. Share tips on dining out less!`
      );
    }
  } else {
    comparativeInsights.push("Add more family members to compare savings and trigger member rankings!");
  }

  res.status(200).json({
    success: true,
    data: {
      memberAnalyses,
      comparativeInsights
    }
  });
});
