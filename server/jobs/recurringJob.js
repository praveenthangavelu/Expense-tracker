import { processRecurringTransactions } from "../services/recurringService.js";
import { processAutoDeductions } from "../services/goalService.js";

/**
 * Initializes and starts the recurring transactions background job.
 *
 * Changes from the original:
 *   - First run is delayed 10 seconds to let the server fully initialize
 *     (DB connection, index sync, etc.) before running the job.
 *   - Interval reduced from 60 minutes to 30 minutes for more timely processing.
 */
export const startRecurringJob = () => {
  const run = async () => {
    try {
      const count = await processRecurringTransactions();
      if (count > 0) {
        console.log(`✅ [Recurring Job] Created ${count} transaction(s)`);
      }
      
      const goalsCount = await processAutoDeductions();
      if (goalsCount > 0) {
        console.log(`✅ [Recurring Job] Processed ${goalsCount} savings goal auto-deductions`);
      }
    } catch (error) {
      console.error("[Recurring Job] Unexpected error:", error.message);
    }
  };

  // Delay first execution so the job doesn't race the DB connection on startup.
  const STARTUP_DELAY_MS = 10_000;
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  setTimeout(() => {
    run();
    setInterval(run, INTERVAL_MS);
  }, STARTUP_DELAY_MS);

  console.log(
    `⏰ Recurring job scheduled — first run in ${STARTUP_DELAY_MS / 1000}s, then every ${INTERVAL_MS / 60000} minutes`
  );
};
