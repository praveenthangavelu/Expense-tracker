export const LEVELS = [
  { level: 1,  title: "Beginner",      minXP: 0,      icon: "🌱", color: "#8B8FA3" },
  { level: 2,  title: "Tracker",       minXP: 100,    icon: "📝", color: "#47C9FF" },
  { level: 3,  title: "Saver",         minXP: 300,    icon: "💰", color: "#63E4B5" },
  { level: 4,  title: "Budgeter",      minXP: 600,    icon: "📊", color: "#7C6FFF" },
  { level: 5,  title: "Planner",       minXP: 1000,   icon: "🗓️", color: "#FFB347" },
  { level: 6,  title: "Strategist",    minXP: 1500,   icon: "♟️", color: "#FF6B6B" },
  { level: 7,  title: "Finance Pro",   minXP: 2200,   icon: "📈", color: "#63E4B5" },
  { level: 8,  title: "Money Master",  minXP: 3000,   icon: "🏆", color: "#FFD700" },
  { level: 9,  title: "Wealth Wizard", minXP: 4000,   icon: "🧙", color: "#B388FF" },
  { level: 10, title: "Financial Legend", minXP: 5500, icon: "👑", color: "#FFD700" }
];

export const getLevel = (xp) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
};

export const getNextLevel = (xp) => {
  const currentLevel = getLevel(xp);
  const nextIndex = LEVELS.findIndex((l) => l.level === currentLevel.level) + 1;
  if (nextIndex >= LEVELS.length) return null;
  return LEVELS[nextIndex];
};

export const getXPProgress = (xp) => {
  const current = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return { percentage: 100, xpInLevel: 0, xpNeeded: 0 };
  const xpInLevel = xp - current.minXP;
  const xpNeeded = next.minXP - current.minXP;
  return { percentage: Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100)), xpInLevel, xpNeeded };
};
