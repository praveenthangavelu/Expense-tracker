import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import SavingsGoal from "../models/SavingsGoal.js";
import AnnualPlan from "../models/AnnualPlan.js";
import MonthlyPlan from "../models/MonthlyPlan.js";
import AutomationLog from "../models/AutomationLog.js";
import User from "../models/User.js";
import { calculateGoalMetrics, checkMilestones, processAutoDeductions } from "./goalService.js";
import { syncActuals, getSmartRecommendations } from "./annualPlanService.js";
import { runAutomationChecks, syncDailyProgress, autoGeneratePlan } from "./monthlyPlanService.js";
import { classifyFood, getHealthAlternative } from "../utils/foodClassifier.js";
import { getDaysInMonth } from "date-fns";

export const runAllAutomations = async (userId) => {
  const startTime = Date.now();
  const queuedPopups = [];

  const user = await User.findById(userId).lean();
  if (!user) return [];

  const settings = user.automationSettings || { enabled: true };
  if (!settings.enabled) return [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // 1. BUDGET CHECKS (MONTHLY PLAN)
  if (settings.budgetAlerts) {
    const budgetPopups = await runAutomationChecks(userId, currentMonth, currentYear);
    queuedPopups.push(...budgetPopups);

    // Additional Check: >50% before 15th
    const monthlyPlan = await MonthlyPlan.findOne({ user: userId, month: currentMonth, year: currentYear }).lean();
    if (monthlyPlan && now.getDate() < 15) {
      const budgetPct = monthlyPlan.totalBudget > 0 ? (monthlyPlan.totalSpent / monthlyPlan.totalBudget) * 100 : 0;
      if (budgetPct > 50) {
        queuedPopups.push({
          id: `monthly_half_limit_${currentMonth}_${currentYear}`,
          type: "nudge",
          emoji: "🚨",
          title: "Budget Running Fast!",
          message: `You have spent ${Math.round(budgetPct)}% of your monthly budget and it's not even the 15th! 🤔`,
          theme: "solar",
        });
      }
    }
  }

  // 2. GOAL CHECKS
  if (settings.goalReminders) {
    // Process auto-deductions if any due
    await processAutoDeductions();

    const activeGoals = await SavingsGoal.find({ user: userId, status: "active" });
    for (const goal of activeGoals) {
      // Check milestones
      const reachedMilestone = checkMilestones(goal);
      if (reachedMilestone) {
        queuedPopups.push({
          id: `goal_milestone_${goal._id}_${reachedMilestone.percent}`,
          type: "celebration",
          emoji: "🎉",
          title: `Milestone Unlocked! ${reachedMilestone.percent}%`,
          message: `Congratulations! You've saved ${reachedMilestone.percent}% of your goal '${goal.title}'! 🏆`,
          theme: "mint",
        });

        await AutomationLog.create({
          user: userId,
          icon: "🎉",
          title: "Goal Milestone Reached",
          description: `Saved ${reachedMilestone.percent}% towards "${goal.title}"`,
          popup: queuedPopups[queuedPopups.length - 1],
        });
      }

      // Check behind track
      const metrics = calculateGoalMetrics(goal);
      if (!metrics.onTrack) {
        queuedPopups.push({
          id: `goal_behind_${goal._id}_${now.getDate()}`,
          type: "nudge",
          emoji: "⚠️",
          title: `Goal Behind: ${goal.title}`,
          message: `Your goal "${goal.title}" is falling behind. You need to save ₹${metrics.requiredWeeklyRate}/week to recover. 🎯`,
          theme: "solar",
        });
      }
      
      // Auto complete check if target amount reached
      if (goal.savedAmount >= goal.targetAmount && goal.status !== "completed") {
        goal.status = "completed";
        goal.completedAt = now;
        await goal.save();

        queuedPopups.push({
          id: `goal_complete_${goal._id}`,
          type: "celebration",
          emoji: "🏆",
          title: "Goal Completed!",
          message: `Hooray! You achieved your savings goal: "${goal.title}"! 🏆`,
          theme: "mint",
        });

        await AutomationLog.create({
          user: userId,
          icon: "🏆",
          title: "Savings Goal Achieved",
          description: `Successfully saved ₹${goal.targetAmount} for "${goal.title}"!`,
          popup: queuedPopups[queuedPopups.length - 1],
        });
      }
    }
  }

  // 3. ANNUAL PLAN SYNC
  const annualPlan = await AnnualPlan.findOne({ user: userId, year: currentYear });
  if (annualPlan) {
    const actuals = await syncActuals(userId, currentYear, currentMonth);
    // Find month in plan
    const mEntry = annualPlan.months.find((m) => m.month === currentMonth);
    if (mEntry) {
      mEntry.actual.income = actuals.actualIncome;
      mEntry.actual.totalExpense = actuals.actualExpense;
      mEntry.actual.savings = actuals.actualSavings;
      mEntry.status = actuals.status;
      await annualPlan.save();

      // Check average expense overage
      const avgExpense = annualPlan.annualExpense / 12;
      if (actuals.actualExpense > avgExpense && avgExpense > 0 && settings.budgetAlerts) {
        queuedPopups.push({
          id: `annual_over_avg_${currentMonth}_${currentYear}`,
          type: "nudge",
          emoji: "📈",
          title: "Above Annual Average!",
          message: `This month's spend (₹${Math.round(actuals.actualExpense)}) is higher than your planned annual monthly average of ₹${Math.round(avgExpense)}.`,
          theme: "solar",
        });
      }
    }
  }

  // Fetch the most recent transaction to run quick checks on it
  const lastTx = await Transaction.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  if (lastTx) {
    // 4. HEALTH CHECK (FOOD + JUNK FOOD)
    if (lastTx.category === "Food" && lastTx.type === "expense" && settings.healthTips) {
      const alt = getHealthAlternative(lastTx.subCategory, lastTx.note, lastTx.amount);
      if (alt && alt.isJunk) {
        queuedPopups.push({
          id: `health_tip_${lastTx._id}`,
          type: "health",
          emoji: "🥗",
          title: "Healthy Choice!",
          message: `Substitute '${lastTx.note || "Junk Food"}' with '${alt.swap}' to save ₹${alt.savings} and stay healthy!`,
          theme: "mint",
          swap: alt.swap,
          savings: alt.savings,
        });

        await AutomationLog.create({
          user: userId,
          icon: "🥗",
          title: "Junk Food Health Swaps",
          description: `Discovered a healthier alternative for "${lastTx.note || "fast food"}"`,
          popup: queuedPopups[queuedPopups.length - 1],
        });
      }
    }

    // 5. SPENDING PATTERN DETECTION
    if (lastTx.type === "expense" && settings.patternAlerts) {
      // Impulse spending check: 3+ transactions in 1 hour
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentTxCount = await Transaction.countDocuments({
        user: userId,
        type: "expense",
        date: { $gte: oneHourAgo },
      });

      if (recentTxCount >= 3) {
        queuedPopups.push({
          id: `pattern_impulse_${now.getHours()}_${now.getDate()}`,
          type: "nudge",
          emoji: "🛑",
          title: "Slow Down!",
          message: "You've made 3 transactions in the last hour. Avoid impulse buying! 🛑",
          theme: "solar",
        });
      }

      // Late-night spending check: after 11 PM
      const hours = new Date(lastTx.date).getHours();
      if (hours >= 23 || hours < 5) {
        queuedPopups.push({
          id: `pattern_latenight_${lastTx._id}`,
          type: "nudge",
          emoji: "🌙",
          title: "Late Night Spending",
          message: `Late night spending detected. Make sure this purchase at ${hours}:00 is essential! 🌙`,
          theme: "solar",
        });
      }

      // Unusual amount check: > 3x user's average transaction amount
      const expenseStats = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense" } },
        { $group: { _id: null, avgAmount: { $avg: "$amount" } } },
      ]);
      const avgTxAmount = expenseStats[0]?.avgAmount || 300;

      if (lastTx.amount > avgTxAmount * 3) {
        queuedPopups.push({
          id: `pattern_unusual_${lastTx._id}`,
          type: "nudge",
          emoji: "🔍",
          title: "Unusual Expense Size!",
          message: `Unusual transaction size of ₹${lastTx.amount} detected. (Average is ₹${Math.round(avgTxAmount)}). 🔍`,
          theme: "solar",
        });
      }
    }
  }

  // 6. SMART NOTIFICATIONS
  // If monthly plan doesn't exist for current month -> suggest creating one
  const monthPlanExists = await MonthlyPlan.exists({ user: userId, month: currentMonth, year: currentYear });
  if (!monthPlanExists) {
    queuedPopups.push({
      id: `smart_nudge_monthly_${currentMonth}_${currentYear}`,
      type: "motivation",
      emoji: "💡",
      title: "Set Monthly Budget!",
      message: "No monthly budget planner found for this month. Tap to auto-generate one! 💡",
      theme: "arctic",
    });
  }

  // If annual plan doesn't exist for current year -> suggest creating one
  const annualPlanExists = await AnnualPlan.exists({ user: userId, year: currentYear });
  if (!annualPlanExists) {
    queuedPopups.push({
      id: `smart_nudge_annual_${currentYear}`,
      type: "motivation",
      emoji: "📅",
      title: "Create Annual Plan!",
      message: `Set up your high-level targets for ${currentYear} to align with long-term savings goals. 📅`,
      theme: "arctic",
    });
  }

  // If no savings goal exists -> suggest creating one
  const goalsCount = await SavingsGoal.countDocuments({ user: userId, status: "active" });
  if (goalsCount === 0) {
    queuedPopups.push({
      id: "smart_nudge_goal_creation",
      type: "motivation",
      emoji: "🎯",
      title: "Start Saving Goals",
      message: "Set your first savings goal! Track emergencies, trips, or gadgets automatically. 🎯",
      theme: "arctic",
    });
  }

  // Savings goal about to expire (< 7 days) and not on track
  const closingGoals = await SavingsGoal.find({
    user: userId,
    status: "active",
    targetDate: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), $gte: now },
  });

  for (const goal of closingGoals) {
    const metrics = calculateGoalMetrics(goal);
    if (!metrics.onTrack) {
      queuedPopups.push({
        id: `smart_nudge_goal_urgent_${goal._id}`,
        type: "nudge",
        emoji: "🚨",
        title: `Goal Expiring: ${goal.title}`,
        message: `Urgent! "${goal.title}" is expiring in ${metrics.daysRemaining} days and is off track. Adjust target or deposit now! 🚨`,
        theme: "solar",
      });
    }
  }

  // Log execution time
  const elapsed = Date.now() - startTime;
  console.log(`⚡ [Automation Engine] Checked all rules for user ${userId} in ${elapsed}ms`);

  // Cap popups to 10 max, only return unique popup IDs
  const seenIds = new Set();
  const uniquePopups = queuedPopups.filter((pop) => {
    if (seenIds.has(pop.id)) return false;
    seenIds.add(pop.id);
    return true;
  });

  return uniquePopups.slice(0, 10);
};

export const runScheduledAutomations = async () => {
  const users = await User.find({ "automationSettings.enabled": true });
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  for (const user of users) {
    const settings = user.automationSettings;
    const userId = user._id;

    // A. Morning Brief: 8 AM
    if (settings.morningBrief) {
      const plan = await MonthlyPlan.findOne({ user: userId, month: currentMonth, year: currentYear });
      if (plan) {
        const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth - 1));
        const remainingDays = Math.max(1, daysInMonth - now.getDate());
        const leftToSpend = Math.max(0, plan.totalBudget - plan.totalSpent);
        const dayBudget = Math.round(leftToSpend / remainingDays);

        let briefMsg = `Good morning! Your calculated budget for today is ₹${dayBudget}. You have ₹${leftToSpend} remaining for this month.`;

        // Check if designated no spend day
        // Let's check if the user has a rule for no-spend day and if today's day of week matches
        const noSpendRule = plan.rules.find((r) => r.type === "no_spend_day" && r.isActive);
        if (noSpendRule) {
          const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
          const targetDay = noSpendRule.config.get("day");
          if (dayOfWeek === targetDay) {
            briefMsg += ` 💪 Today is your designated no-spend day! Keep the wallet closed.`;
          }
        }

        await AutomationLog.create({
          user: userId,
          icon: "☀️",
          title: "Morning Budget Brief",
          description: briefMsg,
          popup: {
            id: `morning_brief_${now.getDate()}_${currentMonth}`,
            type: "motivation",
            emoji: "☀️",
            title: "Morning Budget Brief",
            message: briefMsg,
            theme: "arctic",
          },
        });
      }
    }

    // B. Payday Check
    if (now.getDate() === settings.paydayDate && settings.paydayAmount > 0) {
      const paydayMsg = `Payday alert! ₹${settings.paydayAmount} expected. Available budgets updated automatically.`;
      await AutomationLog.create({
        user: userId,
        icon: "💰",
        title: "Payday Split!",
        description: paydayMsg,
        popup: {
          id: `payday_split_${now.getDate()}_${currentMonth}`,
          type: "celebration",
          emoji: "💰",
          title: "Payday Split!",
          message: paydayMsg,
          theme: "mint",
        },
      });
    }
  }

  console.log(`✅ [Recurring Jobs] Scheduled morning/payday briefs generated for ${users.length} users.`);
};
export default runAllAutomations;
