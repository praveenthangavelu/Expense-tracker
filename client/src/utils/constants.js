export const CATEGORY_EMOJIS = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛒",
  Entertainment: "🎬",
  Health: "💊",
  Education: "📚",
  Rent: "🏠",
  Bills: "📄",
  Salary: "💰",
  Freelance: "💻",
  Investment: "📈",
  Gift: "🎁",
  Travel: "✈️",
  Other: "📌",
};

export const CHART_COLORS = [
  "#10B981",
  "#EF4444",
  "#A78BFA",
  "#F59E0B",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

export const LEVELS = [
  { level: 1, title: "Beginner", minXP: 0, icon: "🌱", color: "#8B8FA3" },
  { level: 2, title: "Tracker", minXP: 100, icon: "📝", color: "#47C9FF" },
  { level: 3, title: "Saver", minXP: 300, icon: "💰", color: "#63E4B5" },
  { level: 4, title: "Budgeter", minXP: 600, icon: "📊", color: "#7C6FFF" },
  { level: 5, title: "Planner", minXP: 1000, icon: "🗓️", color: "#FFB347" },
  { level: 6, title: "Strategist", minXP: 1500, icon: "♟️", color: "#FF6B6B" },
  { level: 7, title: "Finance Pro", minXP: 2200, icon: "📈", color: "#63E4B5" },
  { level: 8, title: "Money Master", minXP: 3000, icon: "🏆", color: "#FFD700" },
  { level: 9, title: "Wealth Wizard", minXP: 4000, icon: "🧙", color: "#B388FF" },
  { level: 10, title: "Financial Legend", minXP: 5500, icon: "👑", color: "#FFD700" },
];

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  type: "",
  category: "",
  startDate: "",
  endDate: "",
  search: "",
  sortBy: "date",
  order: "desc",
};
