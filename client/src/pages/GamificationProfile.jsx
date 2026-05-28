import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Star,
  Target,
  Users,
  Zap,
  Award,
  Clock,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import gamificationService from "../services/gamificationService";

// ─── Tab Definitions ─────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: Zap },
  { id: "badges", label: "Badges", icon: Award },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "leaderboard", label: "Leaderboard", icon: Users },
];

// ─── Tier Config ─────────────────────────────────────────────────────────
const tierConfig = {
  bronze:   { color: "#CD7F32", bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.3)" },
  silver:   { color: "#C0C0C0", bg: "rgba(192,192,192,0.12)", border: "rgba(192,192,192,0.3)" },
  gold:     { color: "#FFD700", bg: "rgba(255,215,0,0.12)",   border: "rgba(255,215,0,0.3)" },
  platinum: { color: "#7C6FFF", bg: "rgba(124,111,255,0.12)", border: "rgba(124,111,255,0.3)" },
  diamond:  { color: "#63E4B5", bg: "rgba(99,228,181,0.12)",  border: "rgba(99,228,181,0.3)" },
};

// ─── Streak Icon Map ─────────────────────────────────────────────────────
const streakMeta = {
  logging:      { label: "Logging",       icon: "📝", color: "#63E4B5" },
  underBudget:  { label: "Under Budget",  icon: "🎯", color: "#7C6FFF" },
  noJunkFood:   { label: "No Junk Food",  icon: "🥗", color: "#10B981" },
  noSpend:      { label: "No Spend",      icon: "🧘", color: "#FFB347" },
  savingsGoal:  { label: "Savings",       icon: "💰", color: "#FFD700" },
};

const GamificationProfile = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const res = await gamificationService.getProfile();
      if (res?.success) setProfile(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async () => {
    try {
      const res = await gamificationService.getBadges();
      if (res?.success) setBadges(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadChallenges = async () => {
    try {
      const res = await gamificationService.getChallenges();
      if (res?.success) setChallenges(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeaderboard = async (period) => {
    try {
      const res = await gamificationService.getLeaderboard(period);
      if (res?.success) setLeaderboard(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "badges" && !badges) loadBadges();
      if (activeTab === "challenges" && !challenges) loadChallenges();
      if (activeTab === "leaderboard") loadLeaderboard(leaderboardPeriod);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, leaderboardPeriod, badges, challenges]);

  const handleJoinChallenge = async (id) => {
    try {
      await gamificationService.joinChallenge(id);
      toast.success("Challenge joined! 🎮");
      loadChallenges();
    } catch (e) {
      toast.error(e.message || "Failed to join challenge");
    }
  };

  const handleAbandonChallenge = async (id) => {
    try {
      await gamificationService.abandonChallenge(id);
      toast.success("Challenge abandoned");
      loadChallenges();
    } catch (e) {
      toast.error(e.message || "Failed to abandon");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-[var(--electric)] border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6">
      {/* ═══════════════ HERO CARD ═══════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6"
      >
        {/* Decorative gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, ${profile?.levelColor || "#7C6FFF"}15 0%, transparent 60%)`,
          }}
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          {/* Avatar + Level */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full font-headline text-xl font-bold text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${profile?.levelColor || "#7C6FFF"}, ${profile?.levelColor || "#7C6FFF"}80)`,
                  boxShadow: `0 0 25px ${profile?.levelColor || "#7C6FFF"}30`,
                }}
              >
                {profile?.user?.avatar || "U"}
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--bg-surface)] text-sm font-bold"
                style={{ background: profile?.levelColor || "#7C6FFF" }}
              >
                {profile?.level}
              </div>
            </div>
            <div>
              <h1 className="font-headline text-xl font-bold text-white">
                {profile?.user?.name}
              </h1>
              <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: profile?.levelColor }}>
                {profile?.levelIcon} {profile?.levelTitle}
              </p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {profile?.xp?.toLocaleString()} XP
              </span>
              {profile?.nextLevel && (
                <span className="text-xs font-semibold text-[var(--text-dim)]">
                  Next: Level {profile?.nextLevel?.level} ({profile?.nextLevel?.title}) — {profile?.nextLevel?.minXP?.toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profile?.xpProgress?.percentage || 0}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${profile?.levelColor}80, ${profile?.levelColor})`,
                  boxShadow: `0 0 10px ${profile?.levelColor}50`,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-dim)]">
              <span>{profile?.xpProgress?.xpInLevel} / {profile?.xpProgress?.xpNeeded} XP in level</span>
              <span>{Math.round(profile?.xpProgress?.percentage || 0)}%</span>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex gap-3 md:flex-col md:items-end">
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-white">
              <Award className="h-3.5 w-3.5 text-[var(--solar)]" />
              {profile?.badges?.earnedCount || 0} Badges
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-white">
              <Target className="h-3.5 w-3.5 text-[var(--mint)]" />
              {profile?.activeChallengesCount || 0} Active
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ TABS ═══════════════ */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-hover)] p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[var(--bg-surface)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB CONTENT ═══════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Streak Cards */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-headline text-base font-bold text-white">
                <Flame className="h-5 w-5 text-[var(--flame)]" /> Active Streaks
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {Object.entries(profile?.streaks || {}).map(([key, data]) => {
                  const meta = streakMeta[key] || { label: key, icon: "📊", color: "#8B8FA3" };
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-center"
                    >
                      <div className="mb-2 text-2xl">{meta.icon}</div>
                      <div className="mb-1 text-2xl font-black" style={{ color: meta.color }}>
                        {data?.current || 0}
                      </div>
                      <div className="text-[10px] font-medium text-[var(--text-secondary)]">{meta.label}</div>
                      <div className="mt-1 text-[9px] text-[var(--text-dim)]">
                        Best: {data?.longest || 0}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Recent Badges */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-headline text-base font-bold text-white">
                <Star className="h-5 w-5 text-[var(--solar)]" /> Recent Badges
              </h2>
              {profile?.badges?.earned?.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {profile.badges.earned.slice(0, 6).map((b, i) => {
                    const tc = tierConfig[b.tier] || tierConfig.bronze;
                    return (
                      <motion.div
                        key={b._id || i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex min-w-[140px] flex-col items-center rounded-xl border p-4"
                        style={{ background: tc.bg, borderColor: tc.border }}
                      >
                        <div className="mb-2 text-3xl">{b.icon}</div>
                        <div className="mb-1 text-xs font-bold text-white text-center">{b.name}</div>
                        <div className="text-[10px] font-medium text-center" style={{ color: tc.color }}>
                          {b.tier}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                  <div className="mb-2 text-3xl">🏅</div>
                  <p className="text-sm text-[var(--text-secondary)]">No badges yet. Keep tracking!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "badges" && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Stats bar */}
            {badges && (
              <div className="flex items-center gap-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4">
                <div className="flex-1">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Collected</div>
                  <div className="text-lg font-bold text-white">{badges.earnedCount} / {badges.totalCount}</div>
                </div>
                <div className="h-2 flex-[3] overflow-hidden rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--mint)]"
                    style={{ width: `${(badges.earnedCount / badges.totalCount) * 100}%` }}
                  />
                </div>
                <div className="text-sm font-bold text-[var(--electric)]">
                  {Math.round((badges.earnedCount / badges.totalCount) * 100)}%
                </div>
              </div>
            )}

            {/* Earned */}
            <div>
              <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[var(--solar)]" /> Earned ({badges?.earned?.length || 0})
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(badges?.earned || []).map((b, i) => {
                  const tc = tierConfig[b.tier] || tierConfig.bronze;
                  return (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative overflow-hidden rounded-xl border p-4 text-center transition-all duration-200 hover:shadow-lg"
                      style={{
                        background: tc.bg,
                        borderColor: tc.border,
                      }}
                    >
                      <div className="mb-2 text-3xl group-hover:scale-110 transition-transform">{b.icon}</div>
                      <div className="mb-1 text-xs font-bold text-white">{b.name}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mb-2">{b.description}</div>
                      <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${tc.color}20`, color: tc.color }}>
                        ✨ {b.xpReward} XP
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Unearned */}
            {badges?.unearned?.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Locked ({badges.unearned.length})
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {badges.unearned.map((b) => (
                    <div
                      key={b._id}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)] p-4 text-center opacity-50"
                    >
                      <div className="mb-2 text-3xl grayscale">{b.icon}</div>
                      <div className="mb-1 text-xs font-bold text-[var(--text-secondary)]">{b.name}</div>
                      <div className="text-[10px] text-[var(--text-dim)]">{b.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "challenges" && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h2 className="flex items-center gap-2 font-headline text-base font-bold text-white">
              <Target className="h-5 w-5 text-[var(--mint)]" /> Active Challenges
            </h2>

            {!challenges || challenges.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                <div className="mb-2 text-3xl">🎮</div>
                <p className="text-sm text-[var(--text-secondary)]">No active challenges this month.</p>
                <p className="text-xs text-[var(--text-dim)] mt-1">New challenges generate on the 1st of each month!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((c, i) => (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 transition-all duration-200 hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-2xl shrink-0">
                        {c.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white">{c.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-[var(--electric-soft)] px-2 py-1 text-[10px] font-bold text-[var(--electric)] shrink-0">
                        ⚡ {c.xpReward} XP
                      </div>
                    </div>

                    {/* Progress */}
                    {c.joined && c.userProgress ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Progress: {c.userProgress.current}/{c.userProgress.target}
                          </span>
                          <span className="text-xs font-bold" style={{
                            color: c.userProgress.status === "completed" ? "var(--mint)" :
                                   c.userProgress.status === "failed" ? "var(--flame)" : "var(--electric)"
                          }}>
                            {c.userProgress.status === "completed" ? "✅ Completed!" :
                             c.userProgress.status === "failed" ? "❌ Failed" :
                             `${c.userProgress.percentage}%`}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${c.userProgress.percentage}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--mint)]"
                          />
                        </div>
                        {c.userProgress.status === "active" && (
                          <button
                            onClick={() => handleAbandonChallenge(c._id)}
                            className="mt-3 text-[10px] text-[var(--flame)] hover:underline"
                          >
                            Abandon challenge
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
                          <Clock className="h-3 w-3" />
                          Ends: {new Date(c.endDate).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => handleJoinChallenge(c._id)}
                          className="rounded-lg bg-[var(--electric)] px-3 py-1.5 text-xs font-bold text-[#05060B] hover:brightness-110 transition-all"
                        >
                          Join Challenge
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "leaderboard" && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Period selector */}
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-headline text-base font-bold text-white">
                <Users className="h-5 w-5 text-[var(--electric)]" /> Family Leaderboard
              </h2>
              <div className="flex gap-1 rounded-lg bg-[var(--bg-hover)] p-0.5">
                {["weekly", "monthly", "allTime"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setLeaderboardPeriod(p)}
                    className={`rounded-md px-3 py-1 text-[10px] font-semibold transition-all ${
                      leaderboardPeriod === p
                        ? "bg-[var(--bg-surface)] text-white shadow-sm"
                        : "text-[var(--text-dim)] hover:text-white"
                    }`}
                  >
                    {p === "allTime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {!leaderboard?.members || leaderboard.members.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
                <div className="mb-2 text-3xl">👨‍👩‍👧‍👦</div>
                <p className="text-sm text-[var(--text-secondary)]">Join a family to see the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.members.map((member, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${member.rank}`;
                  return (
                    <motion.div
                      key={member.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                        member.isCurrentUser
                          ? "border-[var(--electric)] bg-[var(--electric-soft)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)] text-lg font-bold">
                        {medal}
                      </div>

                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full font-headline text-xs font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #7C6FFF, #63E4B5)" }}
                        >
                          {member.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {member.name} {member.isCurrentUser && <span className="text-[var(--electric)]">(You)</span>}
                          </div>
                          <div className="text-[10px] text-[var(--text-dim)]">
                            Lv.{member.level} • {member.xp} XP • 🔥 {member.loggingStreak}d
                          </div>
                        </div>
                      </div>

                      {/* Savings Rate */}
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black" style={{
                          color: member.savingsRate >= 30 ? "var(--mint)" :
                                 member.savingsRate >= 10 ? "var(--solar)" : "var(--flame)"
                        }}>
                          {member.savingsRate}%
                        </div>
                        <div className="text-[10px] text-[var(--text-dim)]">savings rate</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GamificationProfile;
