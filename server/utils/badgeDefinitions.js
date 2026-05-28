export const BADGE_DEFINITIONS = [
  // MILESTONE BADGES
  {
    key: "first_transaction",
    name: "First Step",
    description: "Logged your first expense",
    icon: "👣",
    category: "milestone",
    tier: "bronze",
    xpReward: 10,
    condition: { type: "transaction_count", value: 1 }
  },
  {
    key: "10_transactions",
    name: "Getting Started",
    description: "Logged 10 transactions",
    icon: "📝",
    category: "milestone",
    tier: "bronze",
    xpReward: 25,
    condition: { type: "transaction_count", value: 10 }
  },
  {
    key: "50_transactions",
    name: "Dedicated Tracker",
    description: "Logged 50 transactions",
    icon: "📊",
    category: "milestone",
    tier: "silver",
    xpReward: 50,
    condition: { type: "transaction_count", value: 50 }
  },
  {
    key: "100_transactions",
    name: "Centurion",
    description: "Logged 100 transactions",
    icon: "💯",
    category: "milestone",
    tier: "gold",
    xpReward: 100,
    condition: { type: "transaction_count", value: 100 }
  },
  {
    key: "500_transactions",
    name: "Transaction Machine",
    description: "Logged 500 transactions",
    icon: "⚡",
    category: "milestone",
    tier: "platinum",
    xpReward: 250,
    condition: { type: "transaction_count", value: 500 }
  },
  {
    key: "1000_transactions",
    name: "Legendary Tracker",
    description: "Logged 1000 transactions",
    icon: "🏆",
    category: "milestone",
    tier: "diamond",
    xpReward: 500,
    condition: { type: "transaction_count", value: 1000 }
  },

  // STREAK BADGES
  {
    key: "week_warrior",
    name: "Week Warrior",
    description: "Logged expenses every day for 7 days",
    icon: "🗓️",
    category: "streak",
    tier: "bronze",
    xpReward: 30,
    condition: { type: "logging_streak", value: 7 }
  },
  {
    key: "two_week_titan",
    name: "Two-Week Titan",
    description: "14-day logging streak",
    icon: "🔥",
    category: "streak",
    tier: "silver",
    xpReward: 60,
    condition: { type: "logging_streak", value: 14 }
  },
  {
    key: "monthly_machine",
    name: "Monthly Machine",
    description: "30-day logging streak",
    icon: "🌟",
    category: "streak",
    tier: "gold",
    xpReward: 150,
    condition: { type: "logging_streak", value: 30 }
  },
  {
    key: "streak_master",
    name: "Streak Master",
    description: "90-day logging streak",
    icon: "💎",
    category: "streak",
    tier: "platinum",
    xpReward: 500,
    condition: { type: "logging_streak", value: 90 }
  },
  {
    key: "year_long_legend",
    name: "Year-Long Legend",
    description: "365-day logging streak",
    icon: "👑",
    category: "streak",
    tier: "diamond",
    xpReward: 2000,
    condition: { type: "logging_streak", value: 365 },
    isSecret: true
  },

  // BUDGET BADGES
  {
    key: "budget_beginner",
    name: "Budget Beginner",
    description: "Stayed under daily budget for 3 days straight",
    icon: "🎯",
    category: "budget",
    tier: "bronze",
    xpReward: 20,
    condition: { type: "under_budget_streak", value: 3 }
  },
  {
    key: "budget_boss",
    name: "Budget Boss",
    description: "Stayed under budget for a full month",
    icon: "👔",
    category: "budget",
    tier: "gold",
    xpReward: 200,
    condition: { type: "under_budget_streak", value: 30 }
  },
  {
    key: "penny_pincher",
    name: "Penny Pincher",
    description: "Spent less than 50% of monthly budget",
    icon: "🪙",
    category: "budget",
    tier: "silver",
    xpReward: 100,
    condition: { type: "budget_percentage_under", value: 50 }
  },

  // SAVINGS BADGES
  {
    key: "savings_starter",
    name: "Savings Starter",
    description: "Created your first savings goal",
    icon: "🌱",
    category: "savings",
    tier: "bronze",
    xpReward: 15,
    condition: { type: "goal_created", value: 1 }
  },
  {
    key: "savings_star",
    name: "Savings Star",
    description: "Completed your first savings goal",
    icon: "⭐",
    category: "savings",
    tier: "gold",
    xpReward: 200,
    condition: { type: "goal_completed", value: 1 }
  },
  {
    key: "savings_champion",
    name: "Savings Champion",
    description: "Completed 5 savings goals",
    icon: "🏅",
    category: "savings",
    tier: "platinum",
    xpReward: 500,
    condition: { type: "goal_completed", value: 5 }
  },
  {
    key: "first_lakh",
    name: "Lakhpati",
    description: "Total savings across all goals reached ₹1,00,000",
    icon: "💰",
    category: "savings",
    tier: "diamond",
    xpReward: 1000,
    condition: { type: "total_saved", value: 100000 },
    isSecret: true
  },

  // HEALTH BADGES
  {
    key: "health_hero",
    name: "Health Hero",
    description: "7 days without junk food expenses",
    icon: "🥗",
    category: "health",
    tier: "silver",
    xpReward: 75,
    condition: { type: "no_junk_streak", value: 7 }
  },
  {
    key: "clean_eater",
    name: "Clean Eater",
    description: "30 days without junk food expenses",
    icon: "💚",
    category: "health",
    tier: "gold",
    xpReward: 200,
    condition: { type: "no_junk_streak", value: 30 }
  },
  {
    key: "health_score_90",
    name: "Nutrition Ninja",
    description: "Achieved a health score of 90+",
    icon: "🥷",
    category: "health",
    tier: "platinum",
    xpReward: 300,
    condition: { type: "health_score", value: 90 }
  },

  // SOCIAL BADGES
  {
    key: "family_leader",
    name: "Family Leader",
    description: "Created a family and added 3 members",
    icon: "👨👩👧👦",
    category: "social",
    tier: "silver",
    xpReward: 75,
    condition: { type: "family_members", value: 3 }
  },
  {
    key: "family_saver",
    name: "Family Saver",
    description: "Family stayed under budget for a full month",
    icon: "🏠",
    category: "social",
    tier: "gold",
    xpReward: 200,
    condition: { type: "family_under_budget_month", value: 1 }
  },

  // SCANNER BADGES
  {
    key: "first_scan",
    name: "Scanner Rookie",
    description: "Scanned your first receipt",
    icon: "📷",
    category: "scanner",
    tier: "bronze",
    xpReward: 15,
    condition: { type: "receipts_scanned", value: 1 }
  },
  {
    key: "scan_pro",
    name: "Scan Pro",
    description: "Scanned 10 receipts",
    icon: "🧾",
    category: "scanner",
    tier: "silver",
    xpReward: 50,
    condition: { type: "receipts_scanned", value: 10 }
  },
  {
    key: "paperless",
    name: "Paperless",
    description: "Scanned 50 receipts",
    icon: "♻️",
    category: "scanner",
    tier: "gold",
    xpReward: 150,
    condition: { type: "receipts_scanned", value: 50 }
  },

  // SPECIAL BADGES
  {
    key: "night_owl",
    name: "Night Owl",
    description: "Logged an expense after midnight",
    icon: "🦉",
    category: "special",
    tier: "bronze",
    xpReward: 5,
    condition: { type: "late_night_log", value: 1 },
    isSecret: true
  },
  {
    key: "early_bird",
    name: "Early Bird",
    description: "Logged an expense before 6 AM",
    icon: "🐦",
    category: "special",
    tier: "bronze",
    xpReward: 5,
    condition: { type: "early_morning_log", value: 1 },
    isSecret: true
  },
  {
    key: "zero_day",
    name: "Zero Day Hero",
    description: "Had a completely free day — ₹0 spent",
    icon: "🧘",
    category: "special",
    tier: "silver",
    xpReward: 40,
    condition: { type: "zero_spend_day", value: 1 }
  },
  {
    key: "comeback_kid",
    name: "Comeback Kid",
    description: "Recovered a broken streak and built it back to 7 days",
    icon: "💪",
    category: "special",
    tier: "silver",
    xpReward: 50,
    condition: { type: "streak_recovery", value: 7 },
    isSecret: true
  }
];
