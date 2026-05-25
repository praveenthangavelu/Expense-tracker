// CRUD stands for Create, Read, Update, Delete.
// In this API, POST creates transactions, GET reads transactions, PUT updates transactions, and DELETE removes transactions.
//
// Every database query includes user: req.user.id for multi-tenant data isolation.
// Multi-tenant means many users share one app/database, so every user must only see their own data.
//
// Request lifecycle:
// Route -> auth middleware -> validation middleware when needed -> controller -> database -> JSON response.

// Import asyncHandler so async errors are passed to the global error handler.
import asyncHandler from "../middleware/asyncHandler.js";

// Import the Transaction model so controllers can create, read, update, and delete transactions.
import Transaction from "../models/Transaction.js";

// Import service helpers that build filter queries and dashboard summaries.
import {
  buildFilterQuery,
  getBalance,
  getCategoryBreakdown,
  getFoodBreakdown,
  getMonthlySummary,
} from "../services/transactionService.js";

// Keep sorting limited to real fields users should be allowed to sort by.
const allowedSortFields = ["date", "amount", "category", "type", "createdAt"];

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
  } = req.query;

  // Parse pagination query strings into integers.
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  // Clamp limit between 1 and 100 to avoid accidentally returning too much data at once.
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const filters = { type, category, startDate, endDate };
  const query = buildFilterQuery(req.user.id, filters);

  // countDocuments asks MongoDB to count matches efficiently.
  // We do this separately instead of fetching all documents and counting in Node, which wastes memory and bandwidth.
  const total = await Transaction.countDocuments(query);

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "date";
  const sortDirection = order === "asc" ? 1 : -1;

  // (page - 1) * limit calculates how many documents to skip.
  // Example: page 3, limit 20 -> (3 - 1) * 20 = 40, so MongoDB skips the first 40 records.
  const skip = (parsedPage - 1) * parsedLimit;

  // skip and limit work together for pagination:
  // skip moves past records from earlier pages, and limit controls how many records this page returns.
  const transactions = await Transaction.find(query)
    // Dynamic sorting uses a computed property: [safeSortBy].
    // If safeSortBy is "amount", this becomes { amount: -1 } or { amount: 1 }.
    .sort({ [safeSortBy]: sortDirection })
    .skip(skip)
    .limit(parsedLimit);

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

  // Three smaller aggregation calls are easier to read, test, and maintain than one giant pipeline.
  // A single pipeline might be micro-optimized later, but clarity is better while the app is growing.
  const [balance, monthlySummary, categoryBreakdown, foodBreakdown] = await Promise.all([
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
  // Set user from req.user.id, not req.body.
  // If we trusted req.body.user, a malicious user could fake another user's id and create data under their account.
  const transaction = await Transaction.create({
    ...req.body,
    user: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// PUT /api/transactions/:id
export const update = asyncHandler(async (req, res) => {
  // Check both _id and user.
  // If we only checked _id, a logged-in user could update another user's transaction by guessing its id.
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

  // Object.assign updates only fields present in req.body because validation already removed unknown/invalid data.
  Object.assign(transaction, req.body);

  // save() runs Mongoose validation before storing the updated document.
  const updatedTransaction = await transaction.save();

  res.status(200).json({
    success: true,
    data: updatedTransaction,
  });
});

// DELETE /api/transactions/:id
export const deleteTransaction = asyncHandler(async (req, res) => {
  // Find and delete in one operation, scoped to both transaction id and logged-in user id.
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

  res.status(200).json({
    success: true,
    message: "Transaction deleted",
  });
});
