import { motion } from "framer-motion";

export const SpendingVelocity = ({ spendingVelocity, month, year }) => {
  if (!spendingVelocity) return null;

  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month || (now.getMonth() + 1); // 1-indexed

  // Total days in the selected month
  const totalDays = new Date(currentYear, currentMonth, 0).getDate();

  // Determine current day of the month for pacing
  let dayOfMonth = now.getDate();
  const isCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1);

  if (!isCurrentMonth) {
    if (
      currentYear < now.getFullYear() ||
      (currentYear === now.getFullYear() && currentMonth < now.getMonth() + 1)
    ) {
      // Past month: elapsed completely
      dayOfMonth = totalDays;
    } else {
      // Future month: not started yet
      dayOfMonth = 1;
    }
  }

  const timeElapsedPct = (dayOfMonth / totalDays) * 100;

  const totalExpense = spendingVelocity.dailyRate * dayOfMonth;

  // Cap at 100% for progress lines
  const spentVsBudgetPct =
    spendingVelocity.projectedTotal > 0 && spendingVelocity.dailyRate > 0
      ? Math.min(
          100,
          (totalExpense / (spendingVelocity.projectedTotal || 1)) * 100
        )
      : 0;

  return (
    <div className="glass rounded-[24px] p-6 border border-[var(--border-default)] flex flex-col justify-between">
      <div>
        <h3 className="font-headline text-lg font-bold text-white mb-2">Month so far 📊</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-6 select-text">
          Track how your daily burn rate compares against the monthly schedule.
        </p>

        <div className="space-y-6">
          {/* Racetrack Visual Representation */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              <span>Start (Day 1)</span>
              <span>Mid (Day 15)</span>
              <span>Finish (Day {totalDays})</span>
            </div>

            {/* Horizontal Racetrack Track */}
            <div className="relative h-8 rounded-xl bg-white/5 border border-white/5 flex items-center overflow-hidden">
              {/* Current Position Marker (Elapsed Time) */}
              <div
                className="absolute h-full w-[2px] bg-white/20 top-0"
                style={{ left: `${timeElapsedPct}%` }}
              />

              {/* Spent indicator track */}
              <div
                className="h-full bg-[linear-gradient(90deg,var(--electric-soft),var(--electric-glow))]"
                style={{ width: `${spentVsBudgetPct}%` }}
              />

              {/* Projected Finish Line Flag */}
              <motion.div
                className="absolute h-full w-1.5 bg-[var(--solar)]"
                style={{
                  left:
                    spendingVelocity.projectedTotal > 0
                      ? `${Math.min(
                          99,
                          (spendingVelocity.projectedTotal /
                            Math.max(
                              1,
                              spendingVelocity.projectedTotal + 5000
                            )) *
                            100
                        )}%`
                      : "80%",
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1 font-semibold">
              <span>₹{Math.round(totalExpense)} spent</span>
              <span className="text-[var(--solar)] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--solar)] animate-ping" />
                Projected: ₹{spendingVelocity.projectedTotal}
              </span>
            </div>
          </div>

          {/* Status Stats Summary */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Projected Finish
              </span>
              <span className="font-mono text-lg font-bold text-white block">
                ₹{spendingVelocity.projectedTotal}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                Daily Speed
              </span>
              <span className="font-mono text-sm font-semibold text-white block">
                ₹{spendingVelocity.dailyRate}/day
              </span>
            </div>
          </div>

          {/* Status Message & Badge */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                spendingVelocity.onTrack
                  ? "bg-[var(--mint-soft)] text-[var(--mint)]"
                  : "bg-[var(--flame-soft)] text-[var(--flame)]"
              }`}
            >
              {spendingVelocity.onTrack ? "On Track ✅" : "Over Pace 🚨"}
            </span>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed select-text flex-1">
              {spendingVelocity.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingVelocity;
