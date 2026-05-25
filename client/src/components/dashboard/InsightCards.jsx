import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import { insightService } from "../../services/insightService";
import Card from "../common/Card";
import Skeleton from "../common/Skeleton";

const bgColors = {
  positive: "bg-emerald-500/[0.04] border-emerald-500/20 hover:bg-emerald-500/[0.06]",
  warning: "bg-amber-500/[0.04] border-amber-500/20 hover:bg-amber-500/[0.06]",
  neutral: "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]",
  achievement: "bg-violet-500/[0.04] border-violet-500/20 hover:bg-violet-500/[0.06] relative overflow-hidden",
};

const titleColors = {
  positive: "text-emerald-400",
  warning: "text-amber-400",
  neutral: "text-slate-200",
  achievement: "text-violet-400",
};

export const InsightCards = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const now = new Date();
        const res = await insightService.getInsights({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });
        setInsights(res.data || []);
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
      <Card header={<h2 className="font-display text-lg font-bold text-white flex items-center gap-2"><Lightbulb className="h-5 w-5 text-emerald-400" /> Smart Insights</h2>}>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </Card>
    );
  }

  if (insights.length === 0) return null;

  const displayInsights = insights.slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Smart Insights</span>
          </h2>
          <button
            onClick={() => navigate("/insights")}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      }
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {displayInsights.map((insight, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 ${
              bgColors[insight.type] || bgColors.neutral
            }`}
          >
            <div className="text-3xl select-none leading-none pt-0.5">
              {insight.emoji || "💡"}
            </div>
            <div className="space-y-0.5">
              <p className={`font-semibold text-sm ${titleColors[insight.type] || titleColors.neutral}`}>
                {insight.title}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {insight.description}
              </p>
            </div>
            {insight.type === "achievement" && (
              <span className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-violet-400/10 blur-md animate-pulse" />
            )}
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
};

export default InsightCards;
