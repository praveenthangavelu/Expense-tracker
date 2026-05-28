import { CATEGORY_EMOJIS } from "../../utils/constants";

export const SavingsOpportunities = ({ savingsOpportunities = [] }) => {
  // Total opportunities sum
  const totalMonthlyOpportunity = savingsOpportunities.reduce(
    (sum, item) => sum + item.potentialSaving,
    0
  );

  if (!savingsOpportunities || savingsOpportunities.length === 0) {
    return (
      <div className="glass rounded-[24px] p-6 border border-[var(--border-default)] text-center">
        <span className="text-3xl select-none">💡</span>
        <h3 className="font-headline text-lg font-bold text-white mt-2">No Savings Opportunities</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1 select-text">
          We couldn't identify any significant savings opportunities for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-[24px] p-6 border border-[var(--border-default)]">
      <h3 className="font-headline text-lg font-bold text-white mb-2">Where to save money 💡</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-6 select-text">
        Top categories where a simple 20% trim unlocks major yearly savings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {savingsOpportunities.map((item) => (
          <div
            key={item.category}
            className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xl select-none">
                  {CATEGORY_EMOJIS[item.category] || "📌"}
                </span>
                <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[var(--text-secondary)] font-bold">
                  Cut 20%
                </span>
              </div>
              <h4 className="text-sm font-bold text-white pt-1">{item.category}</h4>
              <p className="font-mono text-xs font-semibold text-[var(--mint)]">
                Save ₹{item.potentialSaving}/mo
              </p>
            </div>

            <div className="pt-2.5 border-t border-white/5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Annual Projection
              </span>
              <p className="font-mono text-xs font-bold text-white">
                ₹{item.potentialSaving * 12}/yr
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-[var(--mint-soft)] border border-rgba(99,228,181,0.1) flex items-center justify-between">
        <span className="text-xs font-semibold text-white">Total potential opportunities:</span>
        <span className="font-mono text-sm font-bold text-[var(--mint)]">
          ₹{totalMonthlyOpportunity}/month
        </span>
      </div>
    </div>
  );
};

export default SavingsOpportunities;
