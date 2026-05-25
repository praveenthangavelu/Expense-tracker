import { processRecurringTransactions } from "../services/recurringService.js";

/**
 * Initializes and starts the recurring transactions cron-like job.
 * Executes once on startup and sets up an hourly interval.
 */
export const startRecurringJob = () => {
  const run = async () => {
    try {
      const count = await processRecurringTransactions();
      console.log(`[Recurring Job] Processed ${count} recurring transactions`);
    } catch (error) {
      console.error("[Recurring Job] Error processing recurring transactions:", error);
    }
  };

  // Run immediately on startup
  run();

  // Run every hour (3600000 ms)
  const intervalMs = 60 * 60 * 1000;
  setInterval(run, intervalMs);
};
