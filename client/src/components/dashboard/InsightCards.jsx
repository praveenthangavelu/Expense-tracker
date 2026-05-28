import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import { insightService } from "../../services/insightService";
import gamificationService from "../../services/gamificationService";
import { Skeleton } from "../common/Skeleton";

const bgColors = {
  positive: "bg-[var(--popup-celebration-bg)] border-[var(--popup-celebration-border)]",
  warning: "bg-[var(--popup-nudge-bg)] border-[var(--popup-nudge-border)]",
  achievement: "bg-[var(--popup-funfact-bg)] border-[var(--popup-funfact-border)]",
  neutral: "bg-[var(--card-bg)] border-[var(--card-border)]",
};

const titleColors = {
  positive: "text-[var(--mint)]",
  warning: "text-[var(--solar)]",
  achievement: "text-[var(--electric)]",
  neutral: "text-[var(--text-primary)]",
};

export const InsightCards = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const now = new Date();
        const [insightsResult, challengesResult] = await Promise.allSettled([
          insightService.getInsights({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          }),
          gamificationService.getMineChallenges(),
        ]);

        if (insightsResult.status === "fulfilled") {
          setInsights(insightsResult.value.data || []);
        } else {
          console.error("Failed to load insights", insightsResult.reason);
        }

        if (challengesResult.status === "fulfilled") {
          const challenges = challengesResult.value.data || [];
          const mostActive = [...challenges].sort(
            (a, b) => getChallengePercentage(b) - getChallengePercentage(a),
          )[0];
          setActiveChallenge(mostActive || null);
        } else {
          console.error("Failed to load challenges", challengesResult.reason);
        }
      } catch (err) {
        console.error("Failed to load insights", err);
      } finally {
        setLoading(false);
      }
    };
    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-[var(--mint)] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Analyzing spending...</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          <Skeleton className="h-24 w-[280px] shrink-0 rounded-xl" />
          <Skeleton className="h-24 w-[280px] shrink-0 rounded-xl" />
          <Skeleton className="h-24 w-[280px] shrink-0 rounded-xl" />
        </div>
      </div>
    );
  }

  const displayInsights = insights.slice(0, 6);
  const challengePercentage = getChallengePercentage(activeChallenge);
  const daysLeft = getDaysLeft(activeChallenge?.endDate);

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-4.5 w-4.5 items-center justify-center rounded-[3px] bg-[var(--mint-soft)] text-[var(--mint)]">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Smart Insights
          </h2>
        </div>
        <button
          onClick={() => navigate("/insights")}
          className="flex items-center gap-1 text-[11px] font-bold text-[var(--electric)] hover:underline"
        >
          <span>View All</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Horizontal Snap Scroll Container */}
      <div className="flex w-full gap-4 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={() => !activeChallenge && navigate("/gamification")}
          role={!activeChallenge ? "link" : undefined}
          tabIndex={!activeChallenge ? 0 : undefined}
          onKeyDown={(event) => {
            if (!activeChallenge && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              navigate("/gamification");
            }
          }}
          className={`flex w-[280px] shrink-0 snap-start items-start gap-3 rounded-xl border p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ${
            activeChallenge
              ? "bg-[var(--popup-funfact-bg)] border-[var(--popup-funfact-border)]"
              : "bg-[var(--card-bg)] border-[var(--card-border)] cursor-pointer hover:border-[var(--electric)]"
          }`}
        >
          {activeChallenge ? (
            <>
              <span className="text-2xl select-none leading-none flex-shrink-0">
                {activeChallenge.icon || "🏆"}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h4 className="truncate text-[13px] font-bold tracking-tight text-[var(--text-primary)]">
                  {activeChallenge.title}
                </h4>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--progress-track)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${challengePercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--mint)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {challengePercentage}% · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl select-none leading-none flex-shrink-0">🏆</span>
              <div className="min-w-0 space-y-0.5">
                <h4 className="truncate text-[13px] font-bold tracking-tight text-[var(--electric)]">
                  Join a challenge 🏆
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-normal">
                  Start a monthly money mission and track progress here.
                </p>
              </div>
            </>
          )}
        </motion.div>

        {displayInsights.map((insight, idx) => {
          const type = insight.type || "neutral";
          const cardBg = bgColors[type] || bgColors.neutral;
          const textClass = titleColors[type] || titleColors.neutral;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: (idx + 1) * 0.05 }}
              className={`flex w-[280px] shrink-0 snap-start items-start gap-3 rounded-xl border p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ${cardBg}`}
            >
              <span className="text-2xl select-none leading-none flex-shrink-0">
                {insight.emoji || "💡"}
              </span>
              <div className="min-w-0 space-y-0.5">
                <h4 className={`truncate text-xs font-bold tracking-tight ${textClass}`}>
                  {insight.title}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-normal line-clamp-2">
                  {insight.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const getChallengePercentage = (challenge) =>
  Math.min(
    100,
    Math.max(
      0,
      Number(challenge?.userProgress?.percentage ?? challenge?.progress?.percentage ?? 0),
    ),
  );

const getDaysLeft = (endDate) => {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
};

export default InsightCards;
