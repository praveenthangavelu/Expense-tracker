import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import { generateRandomPopup } from "../services/popupService.js";
import { classifyFood } from "../utils/foodClassifier.js";
import AutomationLog from "../models/AutomationLog.js";

/**
 * GET /api/popups/random
 * Fetch a random spending popup
 */
export const getRandomPopup = asyncHandler(async (req, res) => {
  const popup = await generateRandomPopup(req.user.id);
  res.status(200).json({
    success: true,
    data: popup
  });
});

/**
 * GET /api/popups/action
 * Generate a contextual action-based popup
 */
export const getActionPopup = asyncHandler(async (req, res) => {
  const { action, data: dataStr } = req.query;
  const userId = req.user.id;
  
  let data = {};
  if (dataStr) {
    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      // Ignored
    }
  }

  const user = await User.findById(userId);
  const dismissed = user?.dismissedPopups || [];

  if (action === "transaction_added") {
    const { transaction } = data;
    if (!transaction) {
      return res.status(400).json({ success: false, message: "Transaction data required" });
    }

    // Check if it's a food expense and junk food (Feature 2)
    if (transaction.category === "Food") {
      const isJunk = classifyFood(transaction.subCategory, transaction.note) === "junk";
      if (!isJunk && !dismissed.includes("healthy_choice_toast")) {
        return res.status(200).json({
          success: true,
          data: {
            id: "healthy_choice_toast",
            type: "celebration",
            emoji: "🥗",
            title: "Healthy Choice!",
            message: "Healthy choice! 🥗 Your health score loves this.",
            theme: "mint"
          }
        });
      }
    }

    // Check if it's a big purchase (amount > 1.5 * average expense)
    const expenseStats = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense" } },
      { $group: { _id: null, avgAmount: { $avg: "$amount" } } }
    ]);
    const avgAmount = expenseStats[0]?.avgAmount || 300;

    if (transaction.type === "expense" && transaction.amount > avgAmount * 1.5 && !dismissed.includes(`big_purchase_${transaction._id}`)) {
      return res.status(200).json({
        success: true,
        data: {
          id: `big_purchase_${transaction._id}`,
          type: "nudge",
          emoji: "🤔",
          title: "Big purchase!",
          message: `Big purchase! ₹${Math.round(transaction.amount)} on ${transaction.category} — is this a need or a want? 🤔`,
          theme: "solar"
        }
      });
    }
  }

  if (action === "daily_login") {
    const todayStr = new Date().toDateString();
    const loginPopupId = `daily_login_${todayStr}`;
    if (!dismissed.includes(loginPopupId)) {
      return res.status(200).json({
        success: true,
        data: {
          id: loginPopupId,
          type: "motivation",
          emoji: "🌟",
          title: "Welcome back!",
          message: "Welcome back! Let's make today a smart spending day 🌟",
          theme: "arctic"
        }
      });
    }
  }

  if (action === "streak_check") {
    const expenseTransactionsOrdered = await Transaction.find({
      user: userId,
      type: "expense"
    }).sort({ date: 1 }).select("date");

    if (expenseTransactionsOrdered.length >= 3) {
      const dates = [...new Set(expenseTransactionsOrdered.map(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      }))].sort();
      
      let currentStreak = 1;
      let maxStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diff === 1) currentStreak++;
        else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
      const finalStreak = Math.max(maxStreak, currentStreak);
      const streakPopupId = `streak_check_${finalStreak}`;
      
      if (finalStreak >= 3 && !dismissed.includes(streakPopupId)) {
        return res.status(200).json({
          success: true,
          data: {
            id: streakPopupId,
            type: "celebration",
            emoji: "🎉",
            title: "Logging Streak!",
            message: `Consistency beats perfection. You've logged expenses ${finalStreak} days in a row! 📅`,
            theme: "mint"
          }
        });
      }
    }
  }

  if (action === "budget_check") {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);

    const [budget, catExpenses] = await Promise.all([
      Budget.findOne({ user: userId, month: currentMonth, year: currentYear }),
      Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense", date: { $gte: startOfMonth } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
      ])
    ]);

    if (budget && budget.categories && budget.categories.length > 0) {
      for (const bud of budget.categories) {
        const exp = catExpenses.find(e => e._id === bud.category)?.total || 0;
        const usage = bud.limit > 0 ? exp / bud.limit : 0;
        const budgetNudgeId = `budget_warn_${bud.category}_${currentMonth}`;

        if (usage >= 0.85 && usage < 1.0 && !dismissed.includes(budgetNudgeId)) {
          return res.status(200).json({
            success: true,
            data: {
              id: budgetNudgeId,
              type: "nudge",
              emoji: "🚨",
              title: "Budget Alert!",
              message: `You have spent ${Math.round(usage * 100)}% of your ${bud.category} budget limit! 🚨`,
              theme: "solar"
            }
          });
        }
      }
    }
  }

  // Fallback to empty if no conditions trigger or action matches
  res.status(200).json({
    success: true,
    data: null
  });
});

/**
 * POST /api/popups/dismiss
 * Dismiss a popup and store its ID
 */
export const dismissPopup = asyncHandler(async (req, res) => {
  const { popupId } = req.body;
  const userId = req.user.id;

  // Add popup ID to user preferences/dismissed list if not already there
  await User.findByIdAndUpdate(userId, {
    $addToSet: { dismissedPopups: popupId }
  });

  res.status(200).json({
    success: true,
    message: "Popup dismissed successfully"
  });
});

/**
 * GET /api/popups/logs
 * Fetch automation log history
 */
export const getLogs = asyncHandler(async (req, res) => {
  const logs = await AutomationLog.find({ user: req.user.id })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  res.status(200).json({
    success: true,
    data: logs
  });
});
