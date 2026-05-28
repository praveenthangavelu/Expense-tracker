import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import { cache } from "../utils/cache.js";
import { perfMonitor } from "../utils/perfMonitor.js";

// Maximum number of recurring transactions to process in a single batch.
// Prevents excessive memory usage if many recurring records are due at once.
const BATCH_SIZE = 50;

// Compute the next due date based on frequency.
const calculateNextDate = (currentDate, frequency) => {
  switch (frequency) {
    case "daily":
      return addDays(currentDate, 1);
    case "weekly":
      return addWeeks(currentDate, 1);
    case "biweekly":
      return addWeeks(currentDate, 2);
    case "monthly":
      return addMonths(currentDate, 1);
    case "yearly":
      return addYears(currentDate, 1);
    default:
      return addDays(currentDate, 1);
  }
};

/**
 * Processes all active recurring transactions that are due.
 * Uses bulkWrite for batch inserts and updates — far more efficient than
 * individual Transaction.create() + rt.save() calls inside a loop.
 *
 * Returns the total number of transaction records created.
 */
export const processRecurringTransactions = async () => {
  const timer = perfMonitor.startTimer("recurring_job");
  const today = new Date();
  let totalCreated = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      // Fetch one batch of due recurring transactions.
      // .lean() returns plain objects — fine here since we use bulkWrite not .save().
      const dueRecurring = await RecurringTransaction.find({
        isActive: true,
        nextDueDate: { $lte: today },
      })
        .limit(BATCH_SIZE)
        .lean();

      if (dueRecurring.length === 0) {
        hasMore = false;
        break;
      }

      const transactionInserts = [];
      const recurringUpdates = [];
      const affectedUserIds = new Set();

      for (const rt of dueRecurring) {
        let nextDue = new Date(rt.nextDueDate);
        affectedUserIds.add(rt.user.toString());

        // Catch-up loop: if the server was offline, generate all missed transactions.
        while (nextDue <= today && rt.isActive !== false) {
          transactionInserts.push({
            insertOne: {
              document: {
                user: rt.user,
                type: rt.type,
                amount: rt.amount,
                category: rt.category,
                subCategory: rt.subCategory,
                note: rt.note ? `${rt.note} (recurring)` : "(recurring)",
                date: nextDue,
              },
            },
          });

          totalCreated++;
          const newNextDue = calculateNextDate(nextDue, rt.frequency);

          // Deactivate if the next date exceeds the end date.
          if (rt.endDate && newNextDue > new Date(rt.endDate)) {
            rt.isActive = false;
          }

          nextDue = newNextDue;
        }

        recurringUpdates.push({
          updateOne: {
            filter: { _id: rt._id },
            update: {
              $set: {
                nextDueDate: nextDue,
                lastProcessed: today,
                isActive: rt.isActive !== false,
              },
            },
          },
        });
      }

      // Single bulkWrite for all new transactions — one MongoDB round-trip.
      if (transactionInserts.length > 0) {
        await Transaction.bulkWrite(transactionInserts, { ordered: false });
      }

      // Single bulkWrite for all recurring record updates — one MongoDB round-trip.
      if (recurringUpdates.length > 0) {
        await RecurringTransaction.bulkWrite(recurringUpdates, { ordered: false });
      }

      // Invalidate summary cache for all affected users so the next fetch is fresh.
      for (const uid of affectedUserIds) {
        cache.invalidatePattern(`summary:${uid}`);
        cache.invalidatePattern(`budgetStatus:${uid}`);
      }

      // If fewer than BATCH_SIZE came back, there are no more records to process.
      if (dueRecurring.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error("[RecurringService] Error during processing:", error.message);
  }

  perfMonitor.endTimer(timer);
  return totalCreated;
};
