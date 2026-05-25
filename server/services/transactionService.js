// Import mongoose so aggregation pipelines can convert string ids into real ObjectId values.
import mongoose from "mongoose";

// Import the Transaction model so service functions can query transaction data.
import Transaction from "../models/Transaction.js";

// Build a MongoDB query object from optional filter values.
export const buildFilterQuery = (userId, filters = {}) => {
  // Always include user: userId for data isolation and security.
  // Without this, one logged-in user could accidentally or maliciously fetch another user's transactions.
  const query = { user: userId };

  // This query is built dynamically: we add only the filters the client actually provided.
  // That is better than writing many separate if/else queries for every possible filter combination.
  if (["income", "expense"].includes(filters.type)) {
    query.type = filters.type;
  }

  // If a category filter exists, add it to the query.
  if (filters.category) {
    query.category = filters.category;
  }

  // date filters share the same date object so startDate and endDate can work together.
  if (filters.startDate || filters.endDate) {
    query.date = {};
  }

  if (filters.startDate) {
    // $gte means "greater than or equal to" in MongoDB.
    // Here it means transaction date must be on or after startDate.
    query.date.$gte = new Date(filters.startDate);
  }

  if (filters.endDate) {
    // $lte means "less than or equal to" in MongoDB.
    // Here it means transaction date must be on or before endDate.
    query.date.$lte = new Date(filters.endDate);
  }

  // Example output:
  // { user: "abc", type: "expense", date: { $gte: 2025-01-01, $lte: 2025-01-31 } }
  return query;
};

// Calculate total income, total expense, and current balance for one user.
export const getBalance = async (userId) => {
  // aggregate() can transform and summarize data inside MongoDB.
  // find() can fetch matching documents, but aggregate() can group and calculate totals before data reaches Node.
  const result = await Transaction.aggregate([
    {
      // Sample input document:
      // { user: ObjectId("..."), type: "expense", amount: 500, category: "Food" }
      //
      // $match is like WHERE in SQL.
      // It keeps only documents where user equals this logged-in user's id.
      $match: {
        // In normal find() queries, Mongoose casts string ids to ObjectId automatically.
        // In aggregation pipelines, Mongoose does not cast for us, so we create ObjectId manually.
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // Output after $match:
      // only this user's transactions continue to the next stage.
      //
      // $group is like GROUP BY in SQL.
      // It groups documents by type, then calculates a total for each group.
      $group: {
        _id: "$type",

        // $sum: "$amount" means "add the amount field from each document".
        // The $ prefix tells MongoDB that amount is a field name, not the literal word "amount".
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Sample output after $group:
  // [
  //   { _id: "income", total: 50000 },
  //   { _id: "expense", total: 12000 }
  // ]
  const totalIncome = result.find((item) => item._id === "income")?.total || 0;
  const totalExpense = result.find((item) => item._id === "expense")?.total || 0;
  const balance = totalIncome - totalExpense;

  return { totalIncome, totalExpense, balance };
};

// Build month-by-month income and expense totals for a specific year.
export const getMonthlySummary = async (userId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const startOfNextYear = new Date(year + 1, 0, 1);

  return Transaction.aggregate([
    {
      // Sample input document:
      // { user: ObjectId("..."), type: "income", amount: 50000, date: 2025-01-05 }
      //
      // Keep only this user's transactions inside the selected year.
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: startOfYear,
          $lt: startOfNextYear,
        },
      },
    },
    {
      // $month extracts the month number from a date field.
      // January becomes 1, February becomes 2, and December becomes 12.
      //
      // Grouping by two fields ({ month, type }) creates one row for each month/type pair.
      // Example output:
      // { _id: { month: 1, type: "income" }, total: 50000 }
      // { _id: { month: 1, type: "expense" }, total: 12000 }
      // { _id: { month: 2, type: "expense" }, total: 8000 }
      //
      // This feeds a bar chart where each month can show one income bar and one expense bar.
      $group: {
        _id: {
          month: { $month: "$date" },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    {
      // Sort the grouped rows by month from January to December.
      $sort: { "_id.month": 1 },
    },
  ]);
};

// Build expense totals by category for one month.
export const getCategoryBreakdown = async (userId, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  return Transaction.aggregate([
    {
      // Sample input document:
      // { user: ObjectId("..."), type: "expense", amount: 500, category: "Food", date: 2025-01-10 }
      //
      // Keep only this user's expense transactions inside the selected month.
      // We filter for expense only because income categories are not useful for a spending breakdown.
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      // Group by category so every category gets one total.
      // $sum: 1 counts documents, like COUNT(*) in SQL.
      //
      // Example output:
      // { _id: "Food", total: 3000, count: 6 }
      // { _id: "Transport", total: 1200, count: 4 }
      //
      // This feeds a pie chart where each slice is one expense category.
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      // Highest spending categories appear first.
      $sort: { total: -1 },
    },
  ]);
};

// Get food subcategory breakdown for one user.
export const getFoodBreakdown = async (userId, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  return Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        category: "Food",
        type: "expense",
        date: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      $group: {
        _id: "$subCategory",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);
};

// Get per-member food subcategory breakdown for family.
export const getFamilyFoodBreakdown = async (familyMemberIds, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);
  const memberObjectIds = familyMemberIds.map((id) => new mongoose.Types.ObjectId(id));

  return Transaction.aggregate([
    {
      $match: {
        user: { $in: memberObjectIds },
        category: "Food",
        type: "expense",
        date: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      $group: {
        _id: {
          subCategory: "$subCategory",
          user: "$user",
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);
};

// Get combined food subcategory breakdown for family.
export const getFamilyFoodBreakdownCombined = async (familyMemberIds, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);
  const memberObjectIds = familyMemberIds.map((id) => new mongoose.Types.ObjectId(id));

  return Transaction.aggregate([
    {
      $match: {
        user: { $in: memberObjectIds },
        category: "Food",
        type: "expense",
        date: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      $group: {
        _id: "$subCategory",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);
};

export default {
  buildFilterQuery,
  getBalance,
  getMonthlySummary,
  getCategoryBreakdown,
  getFoodBreakdown,
  getFamilyFoodBreakdown,
  getFamilyFoodBreakdownCombined,
};
