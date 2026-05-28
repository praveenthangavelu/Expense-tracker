import cron from "node-cron";
import User from "../models/User.js";
import SavingsGoal from "../models/SavingsGoal.js";
import MonthlyPlan from "../models/MonthlyPlan.js";
import AutomationLog from "../models/AutomationLog.js";
import { runScheduledAutomations } from "../services/automationEngine.js";
import { generateWeeklyReport, generateMonthEndReport, autoGeneratePlan } from "../services/monthlyPlanService.js";
import { checkMidnightStreaks } from "../services/streakService.js";
import { checkAndAwardBadges } from "../services/badgeService.js";
import { updateChallengeProgress, generateMonthlyChallenges } from "../services/challengeService.js";
import { cleanupStalePatterns } from "../services/patternLearningService.js";
import { scanEmails } from "../services/emailScanner.js";
import Notification from "../models/Notification.js";

// Helper: calculate current week number of the month (1-4)
const getWeekNumber = (date) => {
  const day = date.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

// 1. Morning Brief: 8:00 AM daily
export const runMorningBrief = async () => {
  try {
    await runScheduledAutomations();
  } catch (error) {
    console.error("[Scheduled Job] Error in Morning Brief:", error.message);
  }
};

// 2. Weekly Review: Sunday 7:00 PM
export const runWeeklyReview = async () => {
  try {
    const users = await User.find({ "automationSettings.enabled": true, "automationSettings.weeklyReview": true });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const weekNumber = getWeekNumber(now);

    for (const user of users) {
      const plan = await MonthlyPlan.findOne({ user: user._id, month, year });
      if (plan) {
        const report = await generateWeeklyReport(user._id, month, year, weekNumber);
        if (report) {
          await AutomationLog.create({
            user: user._id,
            icon: "📊",
            title: `Weekly Review — Week ${weekNumber}`,
            description: `This week you spent ₹${report.totalSpent} of your ₹${report.budgetForWeek} budget. Grade: ${report.grade}.`,
            popup: {
              id: `weekly_review_popup_${weekNumber}_${month}`,
              type: "funFact",
              emoji: "📊",
              title: `Weekly Review — Week ${weekNumber}`,
              message: report.insight + " " + report.tip,
              theme: "electric",
            },
          });
        }
      }
    }
    console.log(`✅ [Scheduled Job] Sunday Weekly Review ran for ${users.length} users.`);
  } catch (error) {
    console.error("[Scheduled Job] Error in Weekly Review:", error.message);
  }
};

// 3. Monthly Tasks: 1st of month at midnight
export const runMonthlyTasks = async () => {
  try {
    const now = new Date();
    // Previous month details
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.getMonth() + 1;
    const prevYear = prevDate.getFullYear();

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Task A: Mark goals past targetDate with savedAmount < targetAmount as "failed"
    const failedGoalsResult = await SavingsGoal.updateMany(
      {
        status: "active",
        targetDate: { $lt: now },
        $expr: { $lt: ["$savedAmount", "$targetAmount"] },
      },
      { $set: { status: "failed" } }
    );
    if (failedGoalsResult.modifiedCount > 0) {
      console.log(`✅ [Scheduled Job] Marked ${failedGoalsResult.modifiedCount} goals past target date as failed.`);
    }

    // Task B: Generate month-end reports & Roll-forward plans for next month
    const users = await User.find({ "automationSettings.enabled": true });

    for (const user of users) {
      const userId = user._id;

      // 1. Month end report
      if (user.automationSettings.monthlyReport) {
        const prevPlan = await MonthlyPlan.findOne({ user: userId, month: prevMonth, year: prevYear });
        if (prevPlan) {
          const report = await generateMonthEndReport(userId, prevMonth, prevYear);
          if (report) {
            await AutomationLog.create({
              user: userId,
              icon: "🏆",
              title: `Monthly Report Summary`,
              description: `Report for ${prevMonth}/${prevYear} is ready. Adherence grade: ${report.grade}. Total spent: ₹${report.totalSpent}.`,
              popup: {
                id: `monthly_report_popup_${prevMonth}_${prevYear}`,
                type: "celebration",
                emoji: "🏆",
                title: `${prevMonth}/${prevYear} Budget Grade: ${report.grade}`,
                message: `Spent ₹${report.totalSpent} of planned ₹${report.totalBudget}. ${report.takeaways.join(" ")}`,
                theme: "mint",
              },
            });
            prevPlan.status = "completed";
            await prevPlan.save();
          }
        }
      }

      // 2. Auto create next month plan
      const nextPlanExists = await MonthlyPlan.exists({ user: userId, month: currentMonth, year: currentYear });
      if (!nextPlanExists) {
        const defaultData = await autoGeneratePlan(userId, currentMonth, currentYear);
        await MonthlyPlan.create(defaultData);
        
        await AutomationLog.create({
          user: userId,
          icon: "📅",
          title: "New Month Budget Initialized",
          description: `Automatically created budget plan for ${currentMonth}/${currentYear} based on past trends.`,
        });
      }
    }

    console.log(`✅ [Scheduled Job] Monthly roll-over tasks completed for ${users.length} users.`);
  } catch (error) {
    console.error("[Scheduled Job] Error in Monthly Tasks:", error.message);
  }
};

// 4. Halfway Check: 15th of the month at 12:00 PM
export const runHalfwayCheck = async () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const users = await User.find({ "automationSettings.enabled": true });
    for (const user of users) {
      const plan = await MonthlyPlan.findOne({ user: user._id, month, year });
      if (plan) {
        const spentPct = plan.totalBudget > 0 ? Math.round((plan.totalSpent / plan.totalBudget) * 100) : 0;
        let warningMsg = spentPct > 55
          ? `Mid-Month check: You have used ${spentPct}% of your budget. Slow down to avoid overspending!`
          : `Mid-Month check: Great budget control! You have only spent ${spentPct}% of your budget.`;

        await AutomationLog.create({
          user: user._id,
          icon: "⏳",
          title: "Mid-Month Budget Check",
          description: warningMsg,
          popup: {
            id: `halfway_check_popup_${month}`,
            type: spentPct > 55 ? "nudge" : "motivation",
            emoji: "⏳",
            title: "Mid-Month Budget Check",
            message: warningMsg,
            theme: spentPct > 55 ? "solar" : "arctic",
          },
        });
      }
    }
    console.log(`✅ [Scheduled Job] Halfway Check ran for ${users.length} users.`);
  } catch (error) {
    console.error("[Scheduled Job] Error in Halfway Check:", error.message);
  }
};

// 5. Midnight Gamification Sweep: 11:59 PM daily
export const runMidnightGamification = async () => {
  try {
    // Run streak checks for all users
    const streakResults = await checkMidnightStreaks();
    console.log(`🔥 [Scheduled Job] Midnight streak sweep: ${streakResults.usersProcessed} users processed.`);

    // Update challenge progress and check badges for all active users
    const users = await User.find({});
    for (const user of users) {
      try {
        await updateChallengeProgress(user._id);
        await checkAndAwardBadges(user._id);
      } catch (err) {
        console.error(`Error updating gamification for user ${user._id}:`, err.message);
      }
    }
    console.log(`🎮 [Scheduled Job] Gamification sweep completed for ${users.length} users.`);

    await cleanupStalePatterns();
    console.log("🧠 [Scheduled Job] Category pattern cleanup completed.");
  } catch (error) {
    console.error("[Scheduled Job] Error in Midnight Gamification:", error.message);
  }
};

// 6. Monthly Challenge Generation: 1st of month at 00:05
export const runMonthlyChallengeGeneration = async () => {
  try {
    const result = await generateMonthlyChallenges();
    console.log(`🎯 [Scheduled Job] Monthly challenges: ${result.message}`);
  } catch (error) {
    console.error("[Scheduled Job] Error generating monthly challenges:", error.message);
  }
};

// 7. Auto Email Scan Job: Every 4 hours
export const runEmailScanJob = async () => {
  try {
    const users = await User.find({
      "googleAuth.isConnected": true,
      "preferences.autoEmailScan": { $ne: false },
    }).select("_id googleAuth.lastScanAt preferences");

    let totalProcessed = 0;

    for (const user of users) {
      try {
        const daysSinceLastScan = user.googleAuth.lastScanAt
          ? Math.ceil((Date.now() - user.googleAuth.lastScanAt) / (1000 * 60 * 60 * 24))
          : 7;

        const result = await scanEmails(user._id, Math.min(daysSinceLastScan, 7));

        if (result.draftsCreated > 0 && user.preferences.notifyEmailScan !== false) {
          await Notification.create({
            user: user._id,
            type: "email_scan",
            title: `${result.draftsCreated} new transactions detected`,
            message: `Found ${result.draftsCreated} transactions from your emails. Review and confirm them.`,
            actionUrl: "/settings?tab=import",
          });
        }
        totalProcessed += result.draftsCreated;
      } catch (err) {
        console.error(`Email scan failed for user ${user._id}:`, err.message);
      }
    }
    console.log(`✅ [Scheduled Job] Email scan complete: ${totalProcessed} drafts created for ${users.length} users.`);
  } catch (error) {
    console.error("[Scheduled Job] Error in Email Scan Job:", error.message);
  }
};

// Setup cron schedule initialization
export const startCronJobs = () => {
  // Morning Brief: Daily at 8:00 AM
  cron.schedule("0 8 * * *", runMorningBrief);

  // Weekly Review: Sunday at 7:00 PM (19:00)
  cron.schedule("0 19 * * 0", runWeeklyReview);

  // Monthly tasks: 1st of month at midnight (00:00)
  cron.schedule("0 0 1 * *", runMonthlyTasks);

  // Halfway Check: 15th of month at 12:00 PM (noon)
  cron.schedule("0 12 15 * *", runHalfwayCheck);

  // Midnight Gamification Sweep: Daily at 11:59 PM
  cron.schedule("59 23 * * *", runMidnightGamification);

  // Monthly Challenge Generation: 1st of month at 00:05 AM
  cron.schedule("5 0 1 * *", runMonthlyChallengeGeneration);

  // Auto Email Scan Job: Every 4 hours (0 */4 * * *)
  cron.schedule("0 */4 * * *", runEmailScanJob);

  console.log("⏰ [Cron Engine] Smart Scheduled Automation Jobs initialized (with Gamification)");
};
export default startCronJobs;
