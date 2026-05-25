import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Award,
  AlertTriangle,
  Compass,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import Card from "../common/Card";
import Loader from "../components/common/Loader";
import { useAuth } from "../context/AuthContext";
import { insightService } from "../services/insightService";
import { MONTH_NAMES } from "../utils/constants";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export const InsightsPage = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [insights, setInsights] = useState([]);
  const [familyInsights, setFamilyInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.familyRole === "admin";

  const fetchAllInsights = async () => {
    setLoading(true);
    try {
      const params = { month: selectedMonth, year: selectedYear };
      
      const promises = [insightService.getInsights(params)];
      if (isAdmin) {
        promises.push(insightService.getFamilyInsights(params));
      }
      
      const [res, famRes] = await Promise.all(promises);
      setInsights(res.data || []);
      if (famRes) {
        setFamilyInsights(famRes.data || []);
      } else {
        setFamilyInsights([]);
      }
    } catch (err) {
      console.error("Failed to load insights", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, isAdmin]);

  // Categorize personal insights
  const groups = useMemo(() => {
    const list = {
      achievements: [],
      warnings: [],
      patterns: [],
    };

    insights.forEach((ins) => {
      if (ins.type === "achievement" || ins.type === "positive") {
        list.achievements.push(ins);
      } else if (ins.type === "warning") {
        list.warnings.push(ins);
      } else {
        list.patterns.push(ins);
      }
    });

    return list;
  }, [insights]);

  const renderInsightGrid = (items) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((insight, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-4 rounded-3xl border p-5 transition-all duration-300 glass ${
            bgColors[insight.type] || bgColors.neutral
          }`}
        >
          <div className="text-4xl select-none leading-none pt-1">
            {insight.emoji || "💡"}
          </div>
          <div className="space-y-1">
            <p className={`font-semibold text-base ${titleColors[insight.type] || titleColors.neutral}`}>
              {insight.title}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {insight.description}
            </p>
          </div>
          {insight.type === "achievement" && (
            <span className="absolute -right-2 -bottom-2 h-10 w-10 rounded-full bg-violet-400/10 blur-md animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-2xl bg-white/[0.04] p-2.5 text-slate-400 hover:text-white border border-white/5 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Smart Spending Insights</span>
            </h2>
            <p className="text-slate-500 text-sm">Category patterns, comparisons, and achievements</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex gap-2 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-2xl border-white/10 bg-white/[0.04] text-white py-2.5 px-4 font-semibold text-xs sm:text-sm focus:border-emerald-400 focus:ring-emerald-400"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {MONTH_NAMES[i]}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-2xl border-white/10 bg-white/[0.04] text-white py-2.5 px-4 font-semibold text-xs sm:text-sm focus:border-emerald-400 focus:ring-emerald-400"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader label="Analyzing transaction patterns..." />
      ) : insights.length === 0 && familyInsights.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center border border-white/5 space-y-4 max-w-[500px] mx-auto mt-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Lightbulb className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-white text-lg">No insights available</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              We need more recorded expenses and income to analyze spending habits, streaks, and MoM trends for this month.
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Achievements Category */}
          {groups.achievements.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-violet-400" />
                <span>Achievements & Positives</span>
              </h3>
              {renderInsightGrid(groups.achievements)}
            </motion.div>
          )}

          {/* Warnings Category */}
          {groups.warnings.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <span>Budget & Trend Warnings</span>
              </h3>
              {renderInsightGrid(groups.warnings)}
            </motion.div>
          )}

          {/* Patterns Category */}
          {groups.patterns.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Compass className="h-5 w-5 text-emerald-400" />
                <span>Spending Behavior & Patterns</span>
              </h3>
              {renderInsightGrid(groups.patterns)}
            </motion.div>
          )}

          {/* Family Insights (Admin Only) */}
          {isAdmin && familyInsights.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3 pt-4">
              <hr className="border-white/5 my-6" />
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <span>Family Group Intelligence</span>
              </h3>
              {renderInsightGrid(familyInsights)}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPage;
