import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, ChevronRight } from "lucide-react";
import goalService from "../../services/goalService";
import Card from "../common/Card";

export const SavingsGoalStrip = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const res = await goalService.getAll();
        // Show only active goals in the strip
        setGoals(res.data?.filter((g) => g.status === "active") || []);
      } catch (err) {
        console.error("Failed to load goals for dashboard strip", err);
      } finally {
        setLoading(false);
      }
    };
    loadGoals();
  }, []);

  if (loading) return <div className="text-xs text-[var(--text-dim)] font-semibold p-2">Checking goals tracker...</div>;

  return (
    <Card
      header={
        <div className="flex items-center justify-between w-full select-none">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--mint)] animate-pulse" />
            <h3 className="font-display text-xs font-bold text-white uppercase tracking-wider">Savings Goals</h3>
          </div>
          <Link
            to="/goals"
            className="text-[10px] font-bold text-[var(--mint)] hover:underline flex items-center gap-0.5 transition"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {goals.length === 0 ? (
          <Link
            to="/goals"
            className="flex-1 min-w-[200px] snap-start flex items-center justify-between p-4 rounded-xl border border-dashed border-[var(--border-strong)] hover:border-[var(--mint)] transition"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Set your first savings goal 🎯</p>
              <p className="text-[9px] text-[var(--text-secondary)] font-medium">Auto-deduct to save effortlessly.</p>
            </div>
            <span className="text-xl">🎯</span>
          </Link>
        ) : (
          goals.map((goal) => {
            const metrics = goal.metrics || { percentComplete: 0, amountRemaining: goal.targetAmount - goal.savedAmount };
            
            const radius = 16;
            const strokeWidth = 3;
            const circ = 2 * Math.PI * radius;
            const strokeDashoffset = circ - (metrics.percentComplete / 100) * circ;

            return (
              <Link
                key={goal._id}
                to="/goals"
                className="w-[200px] shrink-0 snap-start p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{goal.icon}</span>
                    <span>{goal.title}</span>
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium font-mono">
                    ₹{metrics.amountRemaining?.toLocaleString()} left
                  </p>
                </div>

                {/* Micro circular progress ring */}
                <div className="relative h-10 w-10 shrink-0">
                  <svg className="h-full w-full rotate-270" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r={radius} fill="transparent" stroke="var(--bg-surface)" strokeWidth={strokeWidth} />
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      fill="transparent"
                      stroke={goal.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circ}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold font-mono text-white select-none">
                    {metrics.percentComplete}%
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
};
export default SavingsGoalStrip;
