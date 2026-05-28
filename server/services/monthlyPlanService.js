import MonthlyPlan from "../models/MonthlyPlan.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import { getDaysInMonth } from "date-fns";

export const autoGeneratePlan = async (userId, month, year) => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 1. Calculate average income & expenses over last 3 months
  const monthlyTotals = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: threeMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
          category: "$category",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const incomeMonths = {};
  const categoryMonths = {};

  monthlyTotals.forEach((tx) => {
    const key = `${tx._id.year}-${tx._id.month}`;
    if (tx._id.type === "income") {
      incomeMonths[key] = (incomeMonths[key] || 0) + tx.total;
    } else {
      if (!categoryMonths[tx._id.category]) {
        categoryMonths[tx._id.category] = {};
      }
      categoryMonths[tx._id.category][key] = (categoryMonths[tx._id.category][key] || 0) + tx.total;
    }
  });

  const monthCount = Object.keys(incomeMonths).length || 1;
  const avgIncome = Object.values(incomeMonths).reduce((a, b) => a + b, 0) / monthCount || 55000;

  const plannedExpenses = [];
  Object.entries(categoryMonths).forEach(([category, monthsMap]) => {
    const avg = Object.values(monthsMap).reduce((a, b) => a + b, 0) / (Object.keys(monthsMap).length || 1);
    plannedExpenses.push({
      category,
      subcategory: null,
      budgetAmount: Math.round(avg),
      spentAmount: 0,
      remaining: Math.round(avg),
      percentage: 0,
      status: "safe",
      transactions: [],
    });
  });

  // Fallbacks if no data
  if (plannedExpenses.length === 0) {
    const fallbacks = [
      { category: "Food", budget: 10000 },
      { category: "Shopping", budget: 6000 },
      { category: "Entertainment", budget: 4000 },
      { category: "Rent", budget: 15000 },
      { category: "Transport", budget: 3000 },
    ];
    fallbacks.forEach((f) => {
      plannedExpenses.push({
        category: f.category,
        subcategory: null,
        budgetAmount: f.budget,
        spentAmount: 0,
        remaining: f.budget,
        percentage: 0,
        status: "safe",
        transactions: [],
      });
    });
  }

  const totalBudget = plannedExpenses.reduce((sum, c) => sum + c.budgetAmount, 0);
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const weeksInMonth = Math.round(daysInMonth / 7);

  const dailyBudget = Math.round(totalBudget / daysInMonth);
  const weeklyBudget = Math.round(totalBudget / weeksInMonth);
  const savingsTarget = Math.max(0, avgIncome - totalBudget);

  const defaultRules = [
    { type: "daily_limit", config: { limit: dailyBudget }, isActive: true },
    { type: "weekly_limit", config: { limit: weeklyBudget }, isActive: true },
  ];

  const defaultAutomations = [
    { trigger: "category_80", action: "popup", isActive: true },
    { trigger: "category_100", action: "popup", isActive: true },
    { trigger: "daily_exceeded", action: "popup", isActive: true },
    { trigger: "halfway_check", action: "popup", isActive: true },
    { trigger: "week_end_review", action: "popup", isActive: true },
  ];

  // Populate daily log skeleton
  const dailyLog = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyLog.push({
      date: new Date(year, month - 1, d),
      spent: 0,
      budgetForDay: dailyBudget,
      underOver: dailyBudget,
      note: "",
    });
  }

  return {
    user: userId,
    month,
    year,
    plannedIncome: Math.round(avgIncome),
    plannedExpenses,
    totalBudget,
    totalSpent: 0,
    dailyBudget,
    weeklyBudget,
    savingsTarget,
    rules: defaultRules,
    automations: defaultAutomations,
    dailyLog,
    weeklyReview: [],
    status: "active",
  };
};

export const syncDailyProgress = async (userId, month, year) => {
  const plan = await MonthlyPlan.findOne({ user: userId, month, year });
  if (!plan) return null;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Fetch all expenses for this month
  const expenses = await Transaction.find({
    user: userId,
    type: "expense",
    date: { $gte: start, $lte: end },
  });

  const income = await Transaction.find({
    user: userId,
    type: "income",
    date: { $gte: start, $lte: end },
  });

  // Calculate total actual spent
  let totalSpent = 0;
  expenses.forEach((e) => {
    totalSpent += e.amount;
  });
  plan.totalSpent = totalSpent;

  // Sync category breakdown
  plan.plannedExpenses.forEach((pe) => {
    const catExpenses = expenses.filter((e) => e.category === pe.category);
    const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);

    pe.spentAmount = spent;
    pe.remaining = Math.max(0, pe.budgetAmount - spent);
    pe.percentage = pe.budgetAmount > 0 ? Math.round((spent / pe.budgetAmount) * 100) : 0;
    pe.transactions = catExpenses.map((e) => e._id);

    if (pe.percentage >= 100) pe.status = "exceeded";
    else if (pe.percentage >= 90) pe.status = "danger";
    else if (pe.percentage >= 70) pe.status = "warning";
    else pe.status = "safe";
  });

  // Sync daily log
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const dailyBudget = plan.dailyBudget || Math.round(plan.totalBudget / daysInMonth);

  // Re-create log if mismatch in length
  if (plan.dailyLog.length !== daysInMonth) {
    plan.dailyLog = [];
    for (let d = 1; d <= daysInMonth; d++) {
      plan.dailyLog.push({
        date: new Date(year, month - 1, d),
        spent: 0,
        budgetForDay: dailyBudget,
        underOver: dailyBudget,
      });
    }
  }

  plan.dailyLog.forEach((log) => {
    const logDate = new Date(log.date);
    const dayStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const dayExpenses = expenses.filter(
      (e) => e.date >= dayStart && e.date <= dayEnd
    );
    const daySpent = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    log.spent = daySpent;
    log.underOver = log.budgetForDay - daySpent;
  });

  // Sync weekly review
  const weeks = [
    { start: 1, end: 7, number: 1 },
    { start: 8, end: 14, number: 2 },
    { start: 15, end: 21, number: 3 },
    { start: 22, end: daysInMonth, number: 4 },
  ];

  plan.weeklyReview = weeks.map((w) => {
    const weekExpenses = expenses.filter((e) => {
      const day = new Date(e.date).getDate();
      return day >= w.start && day <= w.end;
    });

    const weekSpent = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group days inside this week to find best and worst day
    const dayTotals = {};
    weekExpenses.forEach((e) => {
      const day = new Date(e.date).toDateString();
      dayTotals[day] = (dayTotals[day] || 0) + e.amount;
    });

    let bestDay = null;
    let worstDay = null;
    let maxSpend = -Infinity;
    let minSpend = Infinity;

    Object.entries(dayTotals).forEach(([dateStr, amt]) => {
      if (amt > maxSpend) {
        maxSpend = amt;
        worstDay = { date: new Date(dateStr), amount: amt };
      }
      if (amt < minSpend) {
        minSpend = amt;
        bestDay = { date: new Date(dateStr), amount: amt };
      }
    });

    // Score calculations
    const budgetForWeek = plan.weeklyBudget || Math.round(plan.totalBudget / 4);
    let grade = "A";
    if (weekSpent > budgetForWeek * 1.1) grade = "D";
    else if (weekSpent > budgetForWeek) grade = "C";
    else if (weekSpent > budgetForWeek * 0.9) grade = "B";

    return {
      weekNumber: w.number,
      totalSpent: weekSpent,
      budgetForWeek,
      bestDay: bestDay || { date: new Date(year, month - 1, w.start), amount: 0 },
      worstDay: worstDay || { date: new Date(year, month - 1, w.start), amount: 0 },
      insight: `Week ${w.number} spending grade: ${grade}. Spent ₹${weekSpent} of ₹${budgetForWeek}.`,
    };
  });

  await plan.save();
  return plan;
};

export const runAutomationChecks = async (userId, month, year) => {
  const plan = await syncDailyProgress(userId, month, year);
  if (!plan) return [];

  const queuedPopups = [];
  const now = new Date();
  const today = now.getDate();

  // Find user settings to see what is enabled
  const user = await mongoose.model("User").findById(userId);
  const userSettings = user?.automationSettings || { enabled: true };

  if (!userSettings.enabled) return [];

  // Check 1: Category 80% (category_80)
  if (userSettings.budgetAlerts) {
    const cat80 = plan.automations.find((a) => a.trigger === "category_80" && a.isActive);
    if (cat80) {
      plan.plannedExpenses.forEach((pe) => {
        if (pe.percentage >= 80 && pe.percentage < 100) {
          queuedPopups.push({
            id: `monthly_warn_80_${pe.category}_${month}_${year}`,
            type: "nudge",
            emoji: "🚨",
            title: `${pe.category} Budget Alert!`,
            message: `You've used ${pe.percentage}% of your ${pe.category} budget limit. Only ₹${pe.remaining} left!`,
            theme: "solar",
          });
        }
      });
    }

    // Check 2: Category 100% (category_100)
    const cat100 = plan.automations.find((a) => a.trigger === "category_100" && a.isActive);
    if (cat100) {
      plan.plannedExpenses.forEach((pe) => {
        if (pe.percentage >= 100) {
          queuedPopups.push({
            id: `monthly_warn_100_${pe.category}_${month}_${year}`,
            type: "nudge",
            emoji: "🔥",
            title: `${pe.category} Limit Exceeded!`,
            message: `You've exceeded your ${pe.category} budget by ₹${Math.abs(pe.budgetAmount - pe.spentAmount)}!`,
            theme: "solar",
          });
        }
      });
    }

    // Check 3: Daily Limit Exceeded (daily_exceeded)
    const todayLog = plan.dailyLog.find((l) => new Date(l.date).getDate() === today);
    const dailyExc = plan.automations.find((a) => a.trigger === "daily_exceeded" && a.isActive);
    if (dailyExc && todayLog && todayLog.spent > plan.dailyBudget) {
      queuedPopups.push({
        id: `monthly_daily_exceeded_${today}_${month}`,
        type: "nudge",
        emoji: "🚨",
        title: "Daily Spending Limit!",
        message: `You spent ₹${todayLog.spent} today. That is ₹${Math.abs(todayLog.underOver)} over your daily cap of ₹${plan.dailyBudget}.`,
        theme: "solar",
      });
    }
  }

  // Check 4: Halfway Check (halfway_check) — 15th day
  if (today === 15 && userSettings.enabled) {
    const halfCheck = plan.automations.find((a) => a.trigger === "halfway_check" && a.isActive);
    if (halfCheck) {
      const spentPct = Math.round((plan.totalSpent / plan.totalBudget) * 100);
      let statusMsg = spentPct > 55
        ? `You've spent ${spentPct}% of your budget. Slow down to stay on track!`
        : `Looking good! You've only used ${spentPct}% of your budget. Keep it up!`;
      
      queuedPopups.push({
        id: `monthly_halfway_${month}`,
        type: "motivation",
        emoji: "📅",
        title: "Mid-Month Budget Review",
        message: `You are halfway through the month. ${statusMsg}`,
        theme: "arctic",
      });
    }
  }

  return queuedPopups;
};

export const rebalanceBudget = async (userId, month, year) => {
  const plan = await syncDailyProgress(userId, month, year);
  if (!plan) return null;

  const now = new Date();
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const remainingDays = Math.max(1, daysInMonth - now.getDate());

  const underBudgetCategories = [];
  const overBudgetCategories = [];

  plan.plannedExpenses.forEach((pe) => {
    const variance = pe.budgetAmount - pe.spentAmount;
    if (variance > 800 && pe.percentage < 70) {
      underBudgetCategories.push({ category: pe.category, surplus: variance, currentBudget: pe.budgetAmount });
    } else if (variance < 0) {
      overBudgetCategories.push({ category: pe.category, deficit: Math.abs(variance), currentBudget: pe.budgetAmount });
    }
  });

  const reallocations = [];
  let remainingSurplus = 0;
  let reallocatedAmount = 0;

  underBudgetCategories.forEach((u) => {
    remainingSurplus += u.surplus;
  });

  overBudgetCategories.forEach((o) => {
    if (remainingSurplus > 0) {
      // Reallocate what is needed
      const source = underBudgetCategories.find((u) => u.surplus > 0);
      if (source) {
        const transfer = Math.min(source.surplus, o.deficit);
        source.surplus -= transfer;
        remainingSurplus -= transfer;
        reallocatedAmount += transfer;

        reallocations.push({
          from: source.category,
          to: o.category,
          amount: Math.round(transfer * 0.8), // Keep a small buffer
          reason: `Move surplus buffer from ${source.category} to cover overspending in ${o.category}.`,
        });
      }
    }
  });

  const totalBufferLeft = plan.totalBudget - plan.totalSpent;
  const adjustedDailyBudget = Math.max(0, Math.round(totalBufferLeft / remainingDays));

  return {
    adjustedDailyBudget,
    reallocations,
    revisedBudget: plan.totalBudget,
    remainingDays,
  };
};

export const generateWeeklyReport = async (userId, month, year, weekNumber) => {
  const plan = await syncDailyProgress(userId, month, year);
  if (!plan) return null;

  const review = plan.weeklyReview.find((w) => w.weekNumber === weekNumber);
  if (!review) return null;

  let grade = "A";
  if (review.totalSpent > review.budgetForWeek * 1.1) grade = "D";
  else if (review.totalSpent > review.budgetForWeek) grade = "C";
  else if (review.totalSpent > review.budgetForWeek * 0.9) grade = "B";

  const tips = {
    A: "Incredible control! Put any extra cash into your Savings Goals right now to lock it in. 🎯",
    B: "Good budget adherence. Keep an eye on small micro-spendings to lock in an A next week! 📅",
    C: "You're slightly over budget. Try implementing a no-spend day this week to balance it out. 💪",
    D: "Spending is too high. Open the Monthly Planner and use the Rebalance tool immediately! 🚨",
  };

  return {
    weekNumber,
    totalSpent: review.totalSpent,
    budgetForWeek: review.budgetForWeek,
    grade,
    bestDay: review.bestDay,
    worstDay: review.worstDay,
    insight: review.insight,
    tip: tips[grade],
  };
};

export const generateMonthEndReport = async (userId, month, year) => {
  const plan = await syncDailyProgress(userId, month, year);
  if (!plan) return null;

  const variance = plan.totalSpent - plan.totalBudget;
  const grade = variance <= 0 ? "A" : (variance < plan.totalBudget * 0.1 ? "B" : (variance < plan.totalBudget * 0.25 ? "C" : "D"));

  // Key takeaways
  const takeaways = [];
  const topSpentCat = [...plan.plannedExpenses].sort((a,b) => b.spentAmount - a.spentAmount)[0];
  if (topSpentCat && topSpentCat.spentAmount > 0) {
    takeaways.push(`Your highest spending category this month was ${topSpentCat.category} at ₹${topSpentCat.spentAmount}.`);
  }

  const savedAmt = plan.plannedIncome - plan.totalSpent;
  takeaways.push(`You saved a total of ₹${Math.max(0, savedAmt)} this month.`);

  const exceededCats = plan.plannedExpenses.filter((c) => c.spentAmount > c.budgetAmount);
  if (exceededCats.length > 0) {
    takeaways.push(`You exceeded your limits in ${exceededCats.length} categories: ${exceededCats.map((c) => c.category).join(", ")}.`);
  } else {
    takeaways.push("Amazing job! You did not exceed any category spending limits this month. 🎉");
  }

  // Recommendations for next month
  const recommendations = [];
  if (variance > 0) {
    recommendations.push("Consider increasing your monthly budget limits next month or adjusting targets.");
  } else {
    recommendations.push("Reallocate 10% of unused budgets directly to savings goals next month!");
  }

  return {
    month,
    year,
    plannedIncome: plan.plannedIncome,
    totalBudget: plan.totalBudget,
    totalSpent: plan.totalSpent,
    savingsTarget: plan.savingsTarget,
    actualSavings: Math.max(0, savedAmt),
    grade,
    takeaways,
    recommendations,
  };
};
