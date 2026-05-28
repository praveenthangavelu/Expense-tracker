import SavingsGoal from "../models/SavingsGoal.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

export const calculateGoalMetrics = (goal) => {
  const now = new Date();
  const start = new Date(goal.startDate);
  const target = new Date(goal.targetDate);

  const daysTotal = Math.max(1, Math.round((target - start) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.round((target - now) / (1000 * 60 * 60 * 24)));

  const percentComplete = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  const percentTimeElapsed = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));
  const onTrack = percentComplete >= percentTimeElapsed;

  const amountRemaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  
  const requiredDailyRate = daysRemaining > 0 ? amountRemaining / daysRemaining : 0;
  const requiredWeeklyRate = requiredDailyRate * 7;
  const requiredMonthlyRate = requiredDailyRate * 30;

  const currentDailyRate = goal.savedAmount / daysElapsed;
  
  let projectedCompletion = null;
  if (currentDailyRate > 0 && amountRemaining > 0) {
    const daysNeeded = amountRemaining / currentDailyRate;
    projectedCompletion = new Date(now.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  } else if (amountRemaining === 0) {
    projectedCompletion = goal.completedAt || now;
  }

  const surplusOrDeficit = goal.savedAmount - (goal.targetAmount * (percentTimeElapsed / 100));

  return {
    daysTotal,
    daysElapsed,
    daysRemaining,
    percentComplete,
    percentTimeElapsed,
    onTrack,
    amountRemaining,
    requiredDailyRate: Math.round(requiredDailyRate * 100) / 100,
    requiredWeeklyRate: Math.round(requiredWeeklyRate * 100) / 100,
    requiredMonthlyRate: Math.round(requiredMonthlyRate * 100) / 100,
    projectedCompletion,
    currentDailyRate: Math.round(currentDailyRate * 100) / 100,
    surplusOrDeficit: Math.round(surplusOrDeficit * 100) / 100,
  };
};

export const checkMilestones = (goal) => {
  const percentComplete = (goal.savedAmount / goal.targetAmount) * 100;
  let reachedMilestone = null;

  for (let i = 0; i < goal.milestones.length; i++) {
    const m = goal.milestones[i];
    if (percentComplete >= m.percent && !m.reached) {
      m.reached = true;
      m.reachedAt = new Date();
      reachedMilestone = {
        percent: m.percent,
        reachedAt: m.reachedAt,
        goalTitle: goal.title,
        goalId: goal._id,
      };
    }
  }

  return reachedMilestone;
};

export const processAutoDeductions = async () => {
  const activeGoals = await SavingsGoal.find({ status: "active", autoDeduct: true });
  const now = new Date();
  let processedCount = 0;

  for (const goal of activeGoals) {
    // Check history for the last auto_deduct
    const autoHistory = goal.history
      .filter((h) => h.type === "auto_deduct")
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const lastDeductionDate = autoHistory.length > 0 ? new Date(autoHistory[0].date) : new Date(goal.startDate);
    const diffMs = now - lastDeductionDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let isDue = false;
    if (goal.autoDeductFrequency === "daily" && diffDays >= 1) isDue = true;
    else if (goal.autoDeductFrequency === "weekly" && diffDays >= 7) isDue = true;
    else if (goal.autoDeductFrequency === "monthly" && diffDays >= 30) isDue = true;

    if (isDue) {
      const deductAmount = goal.autoDeductAmount;
      goal.savedAmount += deductAmount;
      goal.history.push({
        date: now,
        amount: deductAmount,
        type: "auto_deduct",
        note: "Automatic savings",
      });

      checkMilestones(goal);

      if (goal.savedAmount >= goal.targetAmount) {
        goal.status = "completed";
        goal.completedAt = now;
      }

      await goal.save();
      processedCount++;
    }
  }

  return processedCount;
};

export const adjustGoalRecommendation = async (userId) => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Calculate average monthly income/expenses
  const transactions = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: threeMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
        },
        monthlyTotal: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: "$_id.type",
        averageAmount: { $avg: "$monthlyTotal" },
      },
    },
  ]);

  const avgIncome = transactions.find((t) => t._id === "income")?.averageAmount || 0;
  const avgExpense = transactions.find((t) => t._id === "expense")?.averageAmount || 0;
  const availableToSave = Math.max(0, avgIncome - avgExpense);

  const activeGoals = await SavingsGoal.find({ user: userId, status: "active" });
  const recommendations = [];

  for (const goal of activeGoals) {
    const metrics = calculateGoalMetrics(goal);
    const reqMonthly = metrics.requiredMonthlyRate;

    let statusText = "Easily achievable 🟢";
    let score = "easy";
    if (availableToSave === 0) {
      statusText = "Unrealistic — no current savings surplus 🔴";
      score = "unrealistic";
    } else {
      const percentage = (reqMonthly / availableToSave) * 100;
      if (percentage < 30) {
        statusText = "Easily achievable 🟢";
        score = "easy";
      } else if (percentage >= 30 && percentage < 60) {
        statusText = "Challenging but doable 🟡";
        score = "challenging";
      } else if (percentage >= 60 && percentage < 90) {
        statusText = "Tight — consider extending deadline 🟠";
        score = "tight";
      } else {
        statusText = "Unrealistic — adjust target or deadline 🔴";
        score = "unrealistic";
      }
    }

    recommendations.push({
      goalId: goal._id,
      goalTitle: goal.title,
      requiredMonthlyRate: reqMonthly,
      availableToSave,
      statusText,
      score,
    });
  }

  return recommendations;
};

export const getGoalInsights = async (userId) => {
  const activeGoals = await SavingsGoal.find({ user: userId, status: "active" });

  let totalSaved = 0;
  let bestPerforming = null;
  let mostAtRisk = null;
  let bestRatio = -Infinity;
  let worstRatio = Infinity;

  activeGoals.forEach((goal) => {
    totalSaved += goal.savedAmount;
    const metrics = calculateGoalMetrics(goal);
    const ratio = metrics.percentComplete - metrics.percentTimeElapsed; // surplus score

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestPerforming = {
        goalId: goal._id,
        title: goal.title,
        percentComplete: metrics.percentComplete,
        percentTimeElapsed: metrics.percentTimeElapsed,
        surplus: metrics.surplusOrDeficit,
      };
    }

    if (ratio < worstRatio) {
      worstRatio = ratio;
      mostAtRisk = {
        goalId: goal._id,
        title: goal.title,
        percentComplete: metrics.percentComplete,
        percentTimeElapsed: metrics.percentTimeElapsed,
        deficit: -metrics.surplusOrDeficit,
      };
    }
  });

  // Projected savings by year end
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const daysLeftInYear = Math.max(0, Math.round((endOfYear - now) / (1000 * 60 * 60 * 24)));

  let currentDailySavingRate = 0;
  activeGoals.forEach((goal) => {
    const metrics = calculateGoalMetrics(goal);
    currentDailySavingRate += metrics.currentDailyRate;
  });

  const projectedYearEndSavings = totalSaved + (currentDailySavingRate * daysLeftInYear);

  // Suggested priority reorder
  const suggestedOrder = [...activeGoals]
    .map((goal) => {
      const metrics = calculateGoalMetrics(goal);
      // Priority score: high priority, near deadline, behind schedule
      let score = 0;
      if (goal.priority === "high") score += 100;
      if (goal.priority === "medium") score += 50;

      // Add points for days remaining (lower remaining = higher score)
      score += Math.max(0, 180 - metrics.daysRemaining) * 0.5;

      // Add points for being behind (deficit is positive)
      if (metrics.surplusOrDeficit < 0) {
        score += Math.abs(metrics.surplusOrDeficit) * 0.1;
      }

      return { goal, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      goalId: item.goal._id,
      title: item.goal.title,
      priority: item.goal.priority,
      daysRemaining: calculateGoalMetrics(item.goal).daysRemaining,
    }));

  return {
    totalSaved,
    bestPerforming,
    mostAtRisk,
    projectedYearEndSavings: Math.round(projectedYearEndSavings),
    suggestedOrder,
  };
};
