import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import asyncHandler from "../middleware/asyncHandler.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

// Helper to advance date based on frequency
const calculateNextDue = (date, frequency) => {
  const parsed = new Date(date);
  switch (frequency) {
    case "daily":
      return addDays(parsed, 1);
    case "weekly":
      return addWeeks(parsed, 1);
    case "biweekly":
      return addWeeks(parsed, 2);
    case "monthly":
      return addMonths(parsed, 1);
    case "yearly":
      return addYears(parsed, 1);
    default:
      return addDays(parsed, 1);
  }
};

// GET /api/recurring
export const getAll = asyncHandler(async (req, res) => {
  const recurring = await RecurringTransaction.find({ user: req.user.id }).sort(
    { nextDueDate: 1 }
  );

  res.status(200).json({
    success: true,
    data: recurring,
  });
});

// POST /api/recurring
export const create = asyncHandler(async (req, res) => {
  const {
    type,
    amount,
    category,
    subCategory,
    note,
    frequency,
    startDate,
    endDate,
  } = req.body;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  const recurring = new RecurringTransaction({
    user: req.user.id,
    type,
    amount,
    category,
    subCategory: subCategory || null,
    note: note || "",
    frequency,
    startDate: start,
    endDate: end,
    nextDueDate: start, // Initial due date is the start date
  });

  const today = new Date();

  // If the startDate is today or in the past, process the first occurrence immediately
  if (start <= today) {
    // 1. Create first transaction record
    await Transaction.create({
      user: req.user.id,
      type,
      amount,
      category,
      subCategory: subCategory || null,
      note: note || "",
      date: start,
    });

    // 2. Set lastProcessed and compute next due date
    recurring.lastProcessed = start;
    const nextDue = calculateNextDue(start, frequency);
    recurring.nextDueDate = nextDue;

    // 3. Deactivate if next occurrence goes past endDate
    if (end && nextDue > end) {
      recurring.isActive = false;
    }
  }

  await recurring.save();

  res.status(201).json({
    success: true,
    data: recurring,
  });
});

// PUT /api/recurring/:id
export const update = asyncHandler(async (req, res) => {
  const recurring = await RecurringTransaction.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!recurring) {
    return res.status(404).json({
      success: false,
      message: "Recurring transaction not found.",
    });
  }

  const {
    amount,
    category,
    subCategory,
    note,
    frequency,
    startDate,
    endDate,
  } = req.body;

  const freqChanged = frequency && frequency !== recurring.frequency;
  const startChanged = startDate && new Date(startDate).getTime() !== new Date(recurring.startDate).getTime();

  if (amount !== undefined) recurring.amount = amount;
  if (category !== undefined) recurring.category = category;
  if (subCategory !== undefined) recurring.subCategory = subCategory || null;
  if (note !== undefined) recurring.note = note || "";
  if (frequency !== undefined) recurring.frequency = frequency;
  if (startDate !== undefined) recurring.startDate = new Date(startDate);
  if (endDate !== undefined) recurring.endDate = endDate ? new Date(endDate) : null;

  // Recalculate nextDueDate if start date or frequency changed
  if (freqChanged || startChanged) {
    // If it hasn't processed any occurrences yet, next due remains the start date.
    // Otherwise, advance it based on the last processed date.
    if (!recurring.lastProcessed) {
      recurring.nextDueDate = recurring.startDate;
    } else {
      recurring.nextDueDate = calculateNextDue(recurring.lastProcessed, recurring.frequency);
    }

    // Check if the recalculation pushes it past endDate
    if (recurring.endDate && recurring.nextDueDate > recurring.endDate) {
      recurring.isActive = false;
    }
  }

  await recurring.save();

  res.status(200).json({
    success: true,
    data: recurring,
  });
});

// DELETE /api/recurring/:id
export const deleteRecurring = asyncHandler(async (req, res) => {
  const recurring = await RecurringTransaction.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!recurring) {
    return res.status(404).json({
      success: false,
      message: "Recurring transaction not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Recurring transaction deleted successfully.",
  });
});

// PATCH /api/recurring/:id/toggle
export const toggleActive = asyncHandler(async (req, res) => {
  const recurring = await RecurringTransaction.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!recurring) {
    return res.status(404).json({
      success: false,
      message: "Recurring transaction not found.",
    });
  }

  recurring.isActive = !recurring.isActive;
  await recurring.save();

  res.status(200).json({
    success: true,
    data: recurring,
  });
});
