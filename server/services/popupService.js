import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import User from "../models/User.js";
import Family from "../models/Family.js";
import { classifyFood } from "../utils/foodClassifier.js";

/**
 * Generate a random popup based on user's real transactions data.
 * If data is insufficient, falls back to general tips in the selected category.
 */
export const generateRandomPopup = async (userId) => {
  const user = await User.findById(userId).populate("family");
  const dismissed = user?.dismissedPopups || [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Helper date boundaries
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startOfLastMonth = new Date(currentMonth === 1 ? currentYear - 1 : currentYear, currentMonth === 1 ? 11 : currentMonth - 2, 1);
  const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);

  // Fetch basic aggregations for stats
  const [
    monthlySummary,
    lastMonthSummary,
    recentFoodTransactions,
    coffeeTransactions,
    yesterdayTransactions,
    weekendWeekdayStats,
    allThisMonthTransactions,
    overallBudget
  ] = await Promise.all([
    // This month income & expense
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]),
    // Last month income & expense
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]),
    // Food transactions this week vs last week
    Transaction.find({
      user: userId,
      category: "Food",
      type: "expense",
      date: { $gte: fourteenDaysAgo }
    }),
    // Coffee transactions this month
    Transaction.find({
      user: userId,
      type: "expense",
      date: { $gte: startOfMonth },
      $or: [
        { subCategory: "Cafe / Coffee" },
        { note: { $regex: /coffee|cafe|starbucks|frappe/i } }
      ]
    }),
    // Yesterday's transactions
    Transaction.find({
      user: userId,
      type: "expense",
      date: { $gte: startOfYesterday, $lt: startOfToday }
    }),
    // Weekend vs Weekday this month
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense", date: { $gte: startOfMonth } } },
      {
        $project: {
          amount: 1,
          dayOfWeek: { $dayOfWeek: "$date" }
        }
      },
      {
        $group: {
          _id: { $in: ["$dayOfWeek", [1, 7]] }, // true = weekend (Sun=1, Sat=7), false = weekday
          total: { $sum: "$amount" }
        }
      }
    ]),
    // All transactions this month
    Transaction.find({
      user: userId,
      date: { $gte: startOfMonth }
    }),
    // Active budget for this month
    Budget.findOne({
      user: userId,
      month: currentMonth,
      year: currentYear
    })
  ]);

  const thisMonthIncome = monthlySummary.find(item => item._id === "income")?.total || 0;
  const thisMonthExpense = monthlySummary.find(item => item._id === "expense")?.total || 0;
  const thisMonthSavings = Math.max(0, thisMonthIncome - thisMonthExpense);

  const lastMonthIncome = lastMonthSummary.find(item => item._id === "income")?.total || 0;
  const lastMonthExpense = lastMonthSummary.find(item => item._id === "expense")?.total || 0;
  const lastMonthSavings = Math.max(0, lastMonthIncome - lastMonthExpense);

  // 1. Calculate streaks (saving streak and consistency)
  const expenseTransactionsOrdered = await Transaction.find({
    user: userId,
    type: "expense"
  }).sort({ date: 1 }).select("date");

  let logStreak = 0;
  let noSpendStreak = 0;
  if (expenseTransactionsOrdered.length >= 3) {
    const dates = [...new Set(expenseTransactionsOrdered.map(t => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }))].sort();
    
    // Calculate logging streak: consecutive days logged
    let currentLogStreak = 1;
    let maxLogStreak = 1;
    let maxGap = 0;

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentLogStreak++;
      } else {
        maxLogStreak = Math.max(maxLogStreak, currentLogStreak);
        currentLogStreak = 1;
        maxGap = Math.max(maxGap, diff - 1);
      }
    }
    logStreak = Math.max(maxLogStreak, currentLogStreak);
    noSpendStreak = maxGap;
  }

  // 2. Categories pool
  const popupsPool = [];

  // ==================== CATEGORY 1: CELEBRATION ====================
  const celebrationTheme = { type: "celebration", theme: "mint", emoji: "🎉", title: "Milestone!" };
  
  if (noSpendStreak >= 3) {
    popupsPool.push({
      ...celebrationTheme,
      id: "streak_no_spend",
      title: "Streak Achieved! 🏆",
      message: `${noSpendStreak}-day no-spend streak! Your wallet is thanking you 🎉`
    });
  }

  if (thisMonthSavings > lastMonthSavings && lastMonthSavings > 0) {
    popupsPool.push({
      ...celebrationTheme,
      id: "saved_more",
      title: "Savings Up! 📈",
      message: `You saved ₹${Math.round(thisMonthSavings - lastMonthSavings)} more than last month! Keep crushing it 💪`
    });
  }

  // Food spend this week vs last week
  const foodThisWeek = recentFoodTransactions
    .filter(t => t.date >= sevenDaysAgo)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const foodLastWeek = recentFoodTransactions
    .filter(t => t.date >= fourteenDaysAgo && t.date < sevenDaysAgo)
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (foodThisWeek < foodLastWeek * 0.8 && foodLastWeek > 100) {
    popupsPool.push({
      ...celebrationTheme,
      id: "food_savings",
      title: "Eating Smart! 🥗",
      message: `Only ₹${Math.round(foodThisWeek)} spent on Food this week — down ${Math.round((1 - foodThisWeek / foodLastWeek) * 100)}% from last week! 🔥`
    });
  }

  // Overall budget milestone
  if (overallBudget && overallBudget.overall > 0) {
    const budgetUsage = thisMonthExpense / overallBudget.overall;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPercentage = dayOfMonth / daysInMonth;

    if (budgetUsage < monthPercentage * 0.8 && thisMonthExpense > 0) {
      popupsPool.push({
        ...celebrationTheme,
        id: "budget_goal_hit",
        title: "Savings Goal! 🏆",
        message: "You're well on track to hit your savings goal for this month! 🏆"
      });
    }
  }

  // No junk food streak (past 5 days)
  const junkFoodLast5Days = recentFoodTransactions
    .filter(t => t.date >= new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))
    .some(t => classifyFood(t.subCategory, t.note) === "junk");

  if (!junkFoodLast5Days && recentFoodTransactions.length > 0) {
    popupsPool.push({
      ...celebrationTheme,
      id: "no_junk_streak",
      title: "Clean Eating! 🥗",
      message: "No junk food expenses in 5 days! Your body says thanks 🥗"
    });
  }

  // Family rank celebration
  if (user?.family) {
    // Let's compare savings rate of family members
    const familyMembers = await User.find({ family: user.family._id });
    const familyMemberIds = familyMembers.map(m => m._id);

    // Sum expense & income this month for all members
    const familyStats = await Transaction.aggregate([
      { $match: { user: { $in: familyMemberIds }, date: { $gte: startOfMonth } } },
      { $group: { _id: { user: "$user", type: "$type" }, total: { $sum: "$amount" } } }
    ]);

    const memberSavings = familyMembers.map(m => {
      const inc = familyStats.find(item => String(item._id.user) === String(m._id) && item._id.type === "income")?.total || 0;
      const exp = familyStats.find(item => String(item._id.user) === String(m._id) && item._id.type === "expense")?.total || 0;
      const rate = inc > 0 ? (inc - exp) / inc : 0;
      return { userId: String(m._id), rate };
    });

    memberSavings.sort((a, b) => b.rate - a.rate);
    const myRank = memberSavings.findIndex(m => m.userId === String(userId));
    if (myRank === 0 && familyMembers.length > 1) {
      popupsPool.push({
        ...celebrationTheme,
        id: "family_rank",
        title: "Family Savings King! 👑",
        message: "You're in the top 10% of savers in your family this month! 👑"
      });
    }
  }

  // ==================== CATEGORY 2: FUN FACT ====================
  const funFactTheme = { type: "funFact", theme: "electric", emoji: "⚡", title: "Fun Fact!" };

  if (coffeeTransactions.length > 0) {
    const totalCoffeeAmount = coffeeTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    const cups = Math.round(totalCoffeeAmount / 150);
    if (totalCoffeeAmount > 0) {
      popupsPool.push({
        ...funFactTheme,
        id: "coffee_fact",
        title: "Coffee Fix ☕",
        message: `You've spent ₹${Math.round(totalCoffeeAmount)} on coffee this month. That's ${cups || 1} cups ☕`
      });
    }
  }

  // Find most expensive day this month
  if (allThisMonthTransactions.length > 0) {
    const dailyExpenses = {};
    allThisMonthTransactions.filter(t => t.type === "expense").forEach(t => {
      const d = new Date(t.date);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      dailyExpenses[dayName] = (dailyExpenses[dayName] || 0) + t.amount;
    });

    let topDay = "";
    let topDaySpend = 0;
    Object.entries(dailyExpenses).forEach(([day, sum]) => {
      if (sum > topDaySpend) {
        topDaySpend = sum;
        topDay = day;
      }
    });

    if (topDaySpend > 0) {
      popupsPool.push({
        ...funFactTheme,
        id: "expensive_day",
        title: "Heavy Days 📊",
        message: `Your most expensive day of the week this month was ${topDay} — you spent ₹${Math.round(topDaySpend)} in total 📊`
      });
    }
  }

  // Eating out average
  const dineOutCount = recentFoodTransactions.filter(t => ["Restaurant / Dine-in", "Fast Food", "Online Food Delivery"].includes(t.subCategory)).length;
  if (dineOutCount > 0) {
    const averageTimesPerWeek = Math.max(1, Math.round(dineOutCount / 2));
    const potentialSaving = Math.round(dineOutCount * 120);
    popupsPool.push({
      ...funFactTheme,
      id: "dine_out_saving",
      title: "Home Cooked vs Outside 🏠",
      message: `You eat out ${averageTimesPerWeek} times a week on average. Home cooking could save you ~₹${potentialSaving}/month 🏠`
    });
  }

  // Projected category expense
  if (allThisMonthTransactions.length > 0) {
    const categoryTotals = {};
    allThisMonthTransactions.filter(t => t.type === "expense").forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    let topCategoryName = "";
    let topCategorySum = 0;
    Object.entries(categoryTotals).forEach(([cat, sum]) => {
      if (sum > topCategorySum) {
        topCategorySum = sum;
        topCategoryName = cat;
      }
    });

    if (topCategorySum > 100) {
      popupsPool.push({
        ...funFactTheme,
        id: "projected_spend",
        title: "Yearly Projection 🤯",
        message: `At this rate, you'll spend ₹${Math.round(topCategorySum * 12)} on ${topCategoryName} this year 🤯`
      });
    }
  }

  // Transaction frequency
  const thisMonthTxCount = allThisMonthTransactions.length;
  if (thisMonthTxCount > 2) {
    const daysElapsed = Math.max(1, now.getDate());
    const averagePerDay = (thisMonthTxCount / daysElapsed).toFixed(1);
    popupsPool.push({
      ...funFactTheme,
      id: "transaction_count",
      title: "Tap Habits 📱",
      message: `You've made ${thisMonthTxCount} transactions this month — that's ${averagePerDay} per day! 📱`
    });
  }

  // Weekend vs Weekday ratio
  const weekendSpend = weekendWeekdayStats.find(item => item._id === true)?.total || 0;
  const weekdaySpend = weekendWeekdayStats.find(item => item._id === false)?.total || 0;
  if (weekendSpend > weekdaySpend && weekdaySpend > 100) {
    const ratio = Math.round(((weekendSpend - weekdaySpend) / weekdaySpend) * 100);
    popupsPool.push({
      ...funFactTheme,
      id: "weekend_surge",
      title: "Weekend Splurge 📈",
      message: `Weekend spending is ${ratio}% higher than weekdays for you 📈`
    });
  }

  // ==================== CATEGORY 3: GENTLE NUDGE ====================
  const nudgeTheme = { type: "nudge", theme: "solar", emoji: "🤔", title: "Gentle Nudge" };

  // Category budget overspending warnings
  if (overallBudget && overallBudget.categories && overallBudget.categories.length > 0) {
    // Let's aggregate category spend
    const catExpenses = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense", date: { $gte: startOfMonth } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } }
    ]);

    overallBudget.categories.forEach(bud => {
      const exp = catExpenses.find(e => e._id === bud.category)?.total || 0;
      const usage = bud.limit > 0 ? exp / bud.limit : 0;
      const day = now.getDate();

      if (usage >= 0.7 && usage < 1.0 && day < 20) {
        popupsPool.push({
          ...nudgeTheme,
          id: `budget_nudge_${bud.category}`,
          title: `${bud.category} Warning! 🤔`,
          message: `You've spent ${Math.round(usage * 100)}% of your ${bud.category} budget and it's only the ${day}th 🤔`
        });
      }
    });
  }

  // Food delivery nudge
  const foodDeliveryThisWeek = recentFoodTransactions
    .filter(t => t.date >= sevenDaysAgo && t.subCategory === "Online Food Delivery")
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (foodDeliveryThisWeek > 300) {
    popupsPool.push({
      ...nudgeTheme,
      id: "food_delivery_nudge",
      title: "Kitchen Call 🍳",
      message: `₹${Math.round(foodDeliveryThisWeek)} on online food delivery this week — maybe cook tonight? 🍳`
    });
  }

  // Yesterday spend compared to daily average
  if (yesterdayTransactions.length > 0) {
    const yesterdayTotal = yesterdayTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Average daily expense from past month
    const pastMonthExpenses = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: "expense", date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const pastMonthTotal = pastMonthExpenses[0]?.total || 0;
    const dailyAverage = pastMonthTotal > 0 ? pastMonthTotal / 30 : 500; // default to 500

    if (yesterdayTotal > dailyAverage * 1.3) {
      const topYesterday = [...yesterdayTransactions].sort((a,b) => b.amount - a.amount)[0];
      popupsPool.push({
        ...nudgeTheme,
        id: "yesterday_spending_nudge",
        title: "Yesterday's Splurge 📌",
        message: `You spent ₹${Math.round(yesterdayTotal)} yesterday (mainly on ${topYesterday.category}) — that's more than your daily average 📌`
      });
    }
  }

  // Saving dynamic projection nudge
  const daySaveNudge = Math.round(now.getDate() * 1.5 + 50); // random-ish but realistic
  popupsPool.push({
    ...nudgeTheme,
    id: "savings_projection_nudge",
    title: "Future Nest-Egg 💡",
    message: `Quick thought: if you save ₹${daySaveNudge}/day, you'll have ₹${Math.round(daySaveNudge * 365)} by year end 💡`
  });

  // Category rising trend (last 3 weeks)
  const categoryTrendStats = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $project: {
        category: 1,
        amount: 1,
        week: {
          $floor: {
            $divide: [
              { $subtract: [now, "$date"] },
              7 * 24 * 60 * 60 * 1000
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: { category: "$category", week: "$week" }, // week 0 = this week, week 1 = 1 week ago, week 2 = 2 weeks ago
        total: { $sum: "$amount" }
      }
    }
  ]);

  const categoryWeeks = {};
  categoryTrendStats.forEach(item => {
    const { category, week } = item._id;
    if (!categoryWeeks[category]) {
      categoryWeeks[category] = { w0: 0, w1: 0, w2: 0 };
    }
    if (week === 0) categoryWeeks[category].w0 = item.total;
    if (week === 1) categoryWeeks[category].w1 = item.total;
    if (week === 2) categoryWeeks[category].w2 = item.total;
  });

  Object.entries(categoryWeeks).forEach(([cat, weeks]) => {
    if (weeks.w0 > weeks.w1 && weeks.w1 > weeks.w2 && weeks.w2 > 50) {
      popupsPool.push({
        ...nudgeTheme,
        id: `rising_trend_${cat}`,
        title: "Trend Alert ↗️",
        message: `Your ${cat} spending has been rising for 3 weeks straight ↗️`
      });
    }
  });

  // ==================== CATEGORY 4: MOTIVATIONAL ====================
  const motivationTheme = { type: "motivation", theme: "arctic", emoji: "💡", title: "Friendly Reminder" };

  popupsPool.push({
    ...motivationTheme,
    id: "rupee_tracked",
    title: "Financial Wisdom 🧠",
    message: "Every rupee tracked is a rupee understood 🧠"
  });

  popupsPool.push({
    ...motivationTheme,
    id: "budgeting_meaning",
    title: "Budget Purpose ❤️",
    message: "Remember: budgeting isn't about restriction — it's about choosing what matters most ❤️"
  });

  // Small purchases count
  const smallPurchases = allThisMonthTransactions.filter(t => t.type === "expense" && t.amount < 150);
  if (smallPurchases.length > 0) {
    const totalSmallAmount = smallPurchases.reduce((acc, curr) => acc + curr.amount, 0);
    if (totalSmallAmount > 100) {
      popupsPool.push({
        ...motivationTheme,
        id: "small_purchases",
        title: "Micro Spending 🔍",
        message: `Small expenses add up. You've tracked ₹${Math.round(totalSmallAmount)} in 'small' purchases this month 🔍`
      });
    }
  }

  // Logging consistency
  if (logStreak >= 3) {
    popupsPool.push({
      ...motivationTheme,
      id: "consistency_streak",
      title: "Consistency! 📅",
      message: `Consistency beats perfection. You've logged expenses ${logStreak} days in a row! 📅`
    });
  }

  // Filter out dismissed popups
  const finalPool = popupsPool.filter(p => !dismissed.includes(p.id));

  // If all matching templates are dismissed or pool is empty, fall back to default general ones
  if (finalPool.length === 0) {
    const defaults = [
      {
        id: "default_wisdom_1",
        type: "motivation",
        theme: "arctic",
        emoji: "🧠",
        title: "Financial Wisdom",
        message: "Every rupee tracked is a rupee understood. Keep up the habit! 🧠"
      },
      {
        id: "default_wisdom_2",
        type: "motivation",
        theme: "arctic",
        emoji: "❤️",
        title: "Budget Purpose",
        message: "Remember: budgeting isn't about restriction — it's about choosing what matters most ❤️"
      },
      {
        id: "default_wisdom_3",
        type: "funFact",
        theme: "electric",
        emoji: "💡",
        title: "Pro Tip",
        message: "Try waiting 48 hours before purchasing non-essential items. You'll be amazed at how many impulses fade away!"
      },
      {
        id: "default_wisdom_4",
        type: "celebration",
        theme: "mint",
        emoji: "🏆",
        title: "Keep Going!",
        message: "You're actively tracking your expenses. That alone places you ahead of most people! 🏆"
      }
    ].filter(d => !dismissed.includes(d.id));

    if (defaults.length === 0) {
      // Last resort fallback (absolute guarantee of return)
      return {
        id: "ultimate_fallback",
        type: "motivation",
        theme: "arctic",
        emoji: "🌟",
        title: "Smart Habits",
        message: "Tracking expenses is the first step to financial freedom. You're doing great!"
      };
    }

    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  // Pick one randomly
  const selectedPopup = finalPool[Math.floor(Math.random() * finalPool.length)];
  return selectedPopup;
};
