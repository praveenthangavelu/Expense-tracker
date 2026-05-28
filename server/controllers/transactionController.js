// Request lifecycle: Route → auth → validation → controller → database → JSON response.
// Every query scoped to user: req.user.id for multi-tenant data isolation.

import asyncHandler from "../middleware/asyncHandler.js";
import Transaction from "../models/Transaction.js";
import { getHealthAlternative } from "../utils/foodClassifier.js";
import { cache } from "../utils/cache.js";
import { runAllAutomations } from "../services/automationEngine.js";
import { updateLoggingStreak } from "../services/streakService.js";
import { awardXP } from "../services/xpService.js";
import { checkAndAwardBadges } from "../services/badgeService.js";
import { updateChallengeProgress } from "../services/challengeService.js";
import {
  categorizeTransaction,
  learnFromUserChoice,
} from "../services/categorizationEngine.js";
import {
  buildFilterQuery,
  getBalance,
  getCategoryBreakdown,
  getFoodBreakdown,
  getMonthlySummary,
} from "../services/transactionService.js";

// Keep sorting limited to real fields to prevent arbitrary field exposure.
const allowedSortFields = ["date", "amount", "category", "type", "createdAt"];

// Helper: build cache invalidation patterns for a user's dependent endpoints.
// Called after any write (create/update/delete) to keep cached summaries fresh.
const invalidateUserCache = (userId) => {
  cache.invalidatePattern(`summary:${userId}`);
  cache.invalidatePattern(`healthScore:${userId}`);
  cache.invalidatePattern(`quickAdvice:${userId}`);
  cache.invalidatePattern(`insights:${userId}`);
  cache.invalidatePattern(`budgetStatus:${userId}`);
};

// GET /api/transactions
export const getAll = asyncHandler(async (req, res) => {
  const {
    page = "1",
    limit = "20",
    type,
    category,
    startDate,
    endDate,
    sortBy = "date",
    order = "desc",
    search,
  } = req.query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  // Clamp between 1 and 100 to avoid accidentally returning too much data.
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const filters = { type, category, startDate, endDate, search };
  const query = buildFilterQuery(req.user.id, filters);

  // countDocuments uses the index and skips fetching document data.
  const total = await Transaction.countDocuments(query);

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "date";
  const sortDirection = order === "asc" ? 1 : -1;
  const skip = (parsedPage - 1) * parsedLimit;

  // .select() fetches only the fields the list view needs — no wasted bandwidth.
  // .lean() returns plain JS objects instead of Mongoose Documents, which is faster
  //   for read-only endpoints that don't call .save() or instance methods.
  const transactions = await Transaction.find(query)
    .select("type amount category subCategory note date receipt _id")
    .sort({ [safeSortBy]: sortDirection })
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  const pages = Math.ceil(total / parsedLimit);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages,
    },
  });
});

// GET /api/transactions/summary
export const getSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  // Run all four aggregations in parallel — they are independent of each other.
  const [balance, monthlySummary, categoryBreakdown, foodBreakdown] =
    await Promise.all([
      getBalance(req.user.id),
      getMonthlySummary(req.user.id, year),
      getCategoryBreakdown(req.user.id, month, year),
      getFoodBreakdown(req.user.id, month, year),
    ]);

  res.status(200).json({
    success: true,
    data: {
      balance,
      monthlySummary,
      categoryBreakdown,
      foodBreakdown,
    },
  });
});

// POST /api/transactions
export const create = asyncHandler(async (req, res) => {
  // user comes from req.user.id, not req.body — prevents spoofing another user's id.
  const hasManualCategory = Boolean(req.body.category);
  const categorization = await categorizeTransaction(req.user.id, {
    note: req.body.note,
    merchant: req.body.merchant,
    amount: req.body.amount,
    date: req.body.date,
    ocrText: req.body.ocrText,
  });

  const transactionBody = { ...req.body };
  delete transactionBody.merchant;
  delete transactionBody.ocrText;
  const transactionPayload = {
    ...transactionBody,
    category:
      hasManualCategory || !categorization.autoApplied
        ? req.body.category || categorization.selected.category
        : categorization.selected.category,
    subCategory:
      hasManualCategory || !categorization.autoApplied
        ? req.body.subCategory ?? null
        : categorization.selected.subCategory,
  };

  const transaction = await Transaction.create({
    ...transactionPayload,
    user: req.user.id,
  });

  await learnFromUserChoice(req.user.id, {
    note: transaction.note,
    merchant: req.body.merchant,
    ocrText: req.body.ocrText,
    chosenCategory: transaction.category,
    chosenSubCategory: transaction.subCategory,
    suggestedCategory: categorization.selected?.category,
  });

  // Health tip: check if this food expense was junk and offer a healthy swap.
  let healthTip = null;
  if (transaction.category === "Food" && transaction.type === "expense") {
    const alt = getHealthAlternative(
      transaction.subCategory,
      transaction.note,
      transaction.amount
    );
    if (alt && alt.isJunk) {
      healthTip = alt;
    }
  }

  // Invalidate cached summaries so the next GET /summary returns fresh data.
  invalidateUserCache(req.user.id);

  const automationResults = await runAllAutomations(req.user.id);

  // ─── Gamification Hooks (non-blocking) ───────────────────────────
  let gamification = null;
  try {
    const [streakResult, xpResult, newBadges, challengeResults] = await Promise.all([
      updateLoggingStreak(req.user.id),
      awardXP(req.user.id, "transaction_logged"),
      checkAndAwardBadges(req.user.id),
      updateChallengeProgress(req.user.id),
    ]);
    gamification = {
      streak: streakResult,
      xp: xpResult,
      newBadges: newBadges.length > 0 ? newBadges : null,
      challenges: challengeResults.length > 0 ? challengeResults : null,
    };
  } catch (err) {
    console.error("Gamification hook error:", err.message);
  }
  // ─────────────────────────────────────────────────────────────────

  res.status(201).json({
    success: true,
    data: {
      transaction,
      healthTip,
      automations: automationResults,
      gamification,
      categorization: {
        autoApplied: !hasManualCategory && categorization.autoApplied,
        source: categorization.source,
        selected: categorization.selected,
        alternatives: categorization.allResults,
      },
    },
  });
});

// PUT /api/transactions/:id
export const update = asyncHandler(async (req, res) => {
  // Check both _id and user so a logged-in user cannot update another user's transaction.
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  Object.assign(transaction, req.body);
  // save() runs Mongoose schema validation before storing.
  const updatedTransaction = await transaction.save();

  let healthTip = null;
  if (updatedTransaction.category === "Food" && updatedTransaction.type === "expense") {
    const alt = getHealthAlternative(
      updatedTransaction.subCategory,
      updatedTransaction.note,
      updatedTransaction.amount
    );
    if (alt && alt.isJunk) {
      healthTip = alt;
    }
  }

  // Invalidate cached summaries after update.
  invalidateUserCache(req.user.id);

  const automationResults = await runAllAutomations(req.user.id);

  res.status(200).json({
    success: true,
    data: { transaction: updatedTransaction, healthTip, automations: automationResults },
  });
});

// DELETE /api/transactions/:id
export const deleteTransaction = asyncHandler(async (req, res) => {
  // findOneAndDelete in one round-trip, scoped to both transaction id and user id.
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  // Invalidate cached summaries after delete.
  invalidateUserCache(req.user.id);

  const automationResults = await runAllAutomations(req.user.id);

  res.status(200).json({
    success: true,
    message: "Transaction deleted",
    automations: automationResults,
  });
});
