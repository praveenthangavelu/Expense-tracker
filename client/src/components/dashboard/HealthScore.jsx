import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { X, Award, AlertTriangle, ShieldCheck, Flame, TrendingDown, TrendingUp, HelpCircle } from "lucide-react";
import healthService from "../../services/healthService";
import { useChartTheme } from "../../hooks/useChartTheme";

export const HealthScore = () => {
  const [scoreData, setScoreData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const chartTheme = useChartTheme();

  const fetchHealthStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [scoreRes, trendRes] = await Promise.all([
        healthService.getHealthScore({ month, year }),
        healthService.getJunkFoodTrend()
      ]);

      if (scoreRes?.success) setScoreData(scoreRes.data);
      if (trendRes?.success) setTrendData(trendRes.data);
    } catch (err) {
      console.error("Failed to load health metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHealthStats();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !scoreData) {
    return (
      <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center h-[180px] animate-pulse">
        <div className="h-16 w-16 rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--mint)] animate-spin" />
        <span className="text-xs text-[var(--text-secondary)] mt-3">Loading Health Score...</span>
      </div>
    );
  }

  const { score, junkCount, healthyCount, neutralCount, topJunkItems } = scoreData;
  const tipsAccepted = parseInt(localStorage.getItem("tips_accepted_count") || "0", 10);

  // Stroke color
  let strokeColor = "var(--mint)";
  let scoreGlow = "rgba(99,228,181,0.15)";
  if (score < 40) {
    strokeColor = "var(--flame)";
    scoreGlow = "rgba(255,107,107,0.15)";
  } else if (score <= 70) {
    strokeColor = "var(--solar)";
    scoreGlow = "rgba(255,179,71,0.15)";
  }

  // Feedback message
  let feedback;
  if (score > 80) {
    feedback = "Your eating habits are great! 🌟";
  } else if (score >= 60) {
    feedback = "Pretty good! Small swaps can make it even better 💪";
  } else if (score >= 40) {
    feedback = "There's room to improve — try one healthy swap today 🥗";
  } else {
    feedback = "Lots of junk this month — your body deserves better ❤️";
  }

  // Circular calculations (r=34, C=213.63)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Pie chart data
  const pieData = [
    { name: "Junk Food", value: junkCount || 0, color: "var(--flame)" },
    { name: "Healthy Food", value: healthyCount || 0, color: "var(--mint)" },
    { name: "Neutral Food", value: neutralCount || 0, color: "var(--text-secondary)" }
  ].filter(item => item.value > 0);

  const total = (junkCount || 0) + (healthyCount || 0) + (neutralCount || 0);

  // If there are no food transactions at all, add a placeholder
  if (pieData.length === 0) {
    pieData.push({ name: "No data", value: 1, color: "var(--border-default)" });
  }

  return (
    <>
      {/* 1. Main Dashboard Card */}
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onClick={() => setModalOpen(true)}
        className="glass rounded-3xl p-6 cursor-pointer hover:border-[var(--border-strong)] transition-all duration-300 relative overflow-hidden"
        style={{
          boxShadow: `0 10px 40px -10px ${scoreGlow}`
        }}
      >
        <div className="flex gap-4 items-center">
          {/* Circular Progress Ring */}
          <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
            <svg className="absolute transform -rotate-95 w-20 h-20">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-[var(--border-default)] fill-transparent"
                strokeWidth="6"
              />
              <motion.circle
                cx="40"
                cy="40"
                r={radius}
                className="fill-transparent"
                stroke={strokeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="flex flex-col items-center justify-center relative z-10">
              <span className="font-mono text-xl font-bold text-[var(--text-primary)] leading-none">{score}</span>
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)] font-bold mt-0.5">Health</span>
            </div>
          </div>

          <div className="flex-1 space-y-1 min-w-0">
            <h4 className="font-headline text-sm font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              Junk Food Health Advisor
              {score >= 60 ? (
                <ShieldCheck className="h-4 w-4 text-[var(--mint)] shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[var(--solar)] shrink-0" />
              )}
            </h4>
            <p className="font-body text-xs text-[var(--text-secondary)] leading-relaxed select-text truncate">
              {feedback}
            </p>
            <span className="text-[10px] font-bold text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors block">
              Click to view detailed breakdown →
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Detailed Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-[620px] rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-default)] p-6 md:p-8 max-h-[90vh] overflow-y-auto scrollbar-none shadow-2xl z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
                <div>
                  <h3 className="font-headline text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Award className="h-5 w-5 text-[var(--mint)]" />
                    Food & Health Advisor
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Analyzing food classifications, swaps, and spending behavior.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-full bg-[var(--bg-hover)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Grid Content */}
              <div className="space-y-6">
                {/* Row 1: Score & Pie Chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Score Card */}
                  <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Health Score</span>
                        <div className="font-mono text-4xl font-extrabold text-[var(--text-primary)] mt-1">{score}%</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--bg-hover)]">
                        {score >= 70 ? (
                          <ShieldCheck className="h-6 w-6 text-[var(--mint)]" />
                        ) : score >= 40 ? (
                          <HelpCircle className="h-6 w-6 text-[var(--solar)]" />
                        ) : (
                          <Flame className="h-6 w-6 text-[var(--flame)]" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed mt-4">
                      {feedback}
                    </div>
                  </div>

                  {/* Classification Donut */}
                  <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 flex flex-col items-center">
                    <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider mr-auto mb-2 pl-1">Classification</span>
                    <div className="h-[120px] w-full relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={46}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <div className="text-lg font-bold text-[var(--text-primary)] font-mono">{total}</div>
                        <div className="text-[8px] uppercase tracking-wider text-[var(--text-secondary)]">Items</div>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-4 text-[10px] font-semibold text-[var(--text-secondary)] mt-1">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--mint)]" /> {healthyCount} Healthy</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--flame)]" /> {junkCount} Junk</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Trend & Impact Stats */}
                <div className="space-y-4">
                  <h4 className="font-headline text-sm font-semibold text-[var(--text-primary)]">4-Week Consumption Trend</h4>
                  <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4">
                    {trendData && trendData.weeks?.length > 0 ? (
                      <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData.weeks} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorJunk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--flame)" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="var(--flame)" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="week" stroke={chartTheme.textColor} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke={chartTheme.textColor} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 12 }}
                              labelStyle={{ fontSize: 10, color: chartTheme.textColor, fontWeight: "bold" }}
                              itemStyle={{ fontSize: 11, color: chartTheme.tooltipText }}
                            />
                            <Area type="monotone" dataKey="junkSpending" stroke="var(--flame)" strokeWidth={2} fillOpacity={1} fill="url(#colorJunk)" name="Junk Spending (₹)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-[var(--text-secondary)] py-6">Insufficient history to calculate trend. Keep logging!</div>
                    )}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      <span>Junk trend behavior:</span>
                      <span className={`font-semibold capitalize flex items-center gap-1 ${
                        trendData?.trend === "improving" ? "text-[var(--mint)]" : trendData?.trend === "worsening" ? "text-[var(--flame)]" : "text-[var(--solar)]"
                      }`}>
                        {trendData?.trend === "improving" && <TrendingDown className="h-3.5 w-3.5" />}
                        {trendData?.trend === "worsening" && <TrendingUp className="h-3.5 w-3.5" />}
                        {trendData?.trend || "Stable"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Top Junk Food Purchases & Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Junk Items */}
                  <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-5 space-y-3">
                    <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider block">Top Junk Expenses</span>
                    {topJunkItems.length > 0 ? (
                      <div className="space-y-2">
                        {topJunkItems.map((item) => (
                          <div key={item._id} className="flex justify-between items-center text-xs">
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)] truncate">{item.note || item.subCategory}</p>
                              <p className="text-[10px] text-[var(--text-secondary)]">{new Date(item.date).toLocaleDateString()}</p>
                            </div>
                            <span className="font-mono font-semibold text-[var(--flame)] shrink-0">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)]">No junk items logged this month. Amazing! 🎉</p>
                    )}
                  </div>

                  {/* Accept statistics & impact */}
                  <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider block">Advisor Impact</span>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-mono text-3xl font-extrabold text-[var(--mint)]">{tipsAccepted}</span>
                        <span className="text-xs text-[var(--text-secondary)]">swaps accepted so far</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] leading-relaxed mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      Swap fast food for home prep once a week to save up to ₹4,000 annually.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HealthScore;
