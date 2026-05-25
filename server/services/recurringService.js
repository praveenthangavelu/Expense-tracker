import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

/**
 * Finds all active recurring transactions that are due,
 * spawns the transaction records, and calculates the next due dates.
 * Can handle catching up multiple intervals if the server was offline.
 */
export const processRecurringTransactions = async () => {
  const today = new Date();
  
  // Find all active recurring transactions that should have been processed
  const dueRecurring = await RecurringTransaction.find({
    isActive: true,
    nextDueDate: { $lte: today },
  });

  let createdCount = 0;

  for (const rt of dueRecurring) {
    let nextDue = new Date(rt.nextDueDate);

    // Keep generating transactions if the nextDue is still in the past (catching up)
    while (nextDue <= today && rt.isActive) {
      await Transaction.create({
        user: rt.user,
        type: rt.type,
        amount: rt.amount,
        category: rt.category,
        subCategory: rt.subCategory,
        note: rt.note,
        date: nextDue,
      });

      createdCount++;

      // Compute next due date
      let newNextDue;
      switch (rt.frequency) {
        case "daily":
          newNextDue = addDays(nextDue, 1);
          break;
        case "weekly":
          newNextDue = addWeeks(nextDue, 1);
          break;
        case "biweekly":
          newNextDue = addWeeks(nextDue, 2);
          break;
        case "monthly":
          newNextDue = addMonths(nextDue, 1);
          break;
        case "yearly":
          newNextDue = addYears(nextDue, 1);
          break;
        default:
          newNextDue = addDays(nextDue, 1);
      }

      rt.lastProcessed = nextDue;
      rt.nextDueDate = newNextDue;
      nextDue = newNextDue;

      // Deactivate if we exceed the end date
      if (rt.endDate && nextDue > rt.endDate) {
        rt.isActive = false;
        break;
      }
    }

    await rt.save();
  }

  return createdCount;
};
