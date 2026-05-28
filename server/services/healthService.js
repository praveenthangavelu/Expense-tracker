import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { classifyFood } from "../utils/foodClassifier.js";

/**
 * Calculates food health score for a specific month and year
 */
export const getHealthScore = async (userId, month, year) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  const transactions = await Transaction.find({
    user: userId,
    category: "Food",
    type: "expense",
    date: { $gte: startOfMonth, $lt: startOfNextMonth }
  });

  let junkCount = 0;
  let healthyCount = 0;
  let neutralCount = 0;
  let junkSpending = 0;
  let healthySpending = 0;
  const junkItems = [];

  transactions.forEach(t => {
    const classification = classifyFood(t.subCategory, t.note);
    if (classification === "junk") {
      junkCount++;
      junkSpending += t.amount;
      junkItems.push({
        _id: t._id,
        amount: t.amount,
        note: t.note || "Unspecified",
        subCategory: t.subCategory || "Fast Food",
        date: t.date
      });
    } else if (classification === "healthy") {
      healthyCount++;
      healthySpending += t.amount;
    } else {
      neutralCount++;
    }
  });

  const total = transactions.length;
  // If no food purchases, default score is 100
  const score = total === 0 ? 100 : Math.round(((healthyCount + neutralCount * 0.5) / total) * 100);

  // Sort junk items by amount descending and get top 3
  const topJunkItems = junkItems
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return {
    score,
    junkCount,
    healthyCount,
    neutralCount,
    junkSpending,
    healthySpending,
    topJunkItems
  };
};

/**
 * Analyze last 4 weeks of junk food spending
 */
export const getJunkFoodTrend = async (userId) => {
  const now = new Date();
  const startOfAnalysis = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const transactions = await Transaction.find({
    user: userId,
    category: "Food",
    type: "expense",
    date: { $gte: startOfAnalysis }
  }).sort({ date: -1 });

  const weeksData = [
    { label: "Week 1", start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now, junkSpending: 0, totalFoodSpending: 0 },
    { label: "Week 2", start: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), junkSpending: 0, totalFoodSpending: 0 },
    { label: "Week 3", start: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), end: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), junkSpending: 0, totalFoodSpending: 0 },
    { label: "Week 4", start: startOfAnalysis, end: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), junkSpending: 0, totalFoodSpending: 0 }
  ];

  transactions.forEach(t => {
    const tDate = new Date(t.date);
    for (let i = 0; i < 4; i++) {
      if (tDate >= weeksData[i].start && tDate < weeksData[i].end) {
        weeksData[i].totalFoodSpending += t.amount;
        if (classifyFood(t.subCategory, t.note) === "junk") {
          weeksData[i].junkSpending += t.amount;
        }
        break;
      }
    }
  });

  const formattedWeeks = weeksData.map((w, index) => {
    const junkPercentage = w.totalFoodSpending === 0 ? 0 : Math.round((w.junkSpending / w.totalFoodSpending) * 100);
    return {
      week: w.label,
      junkSpending: Math.round(w.junkSpending),
      totalFoodSpending: Math.round(w.totalFoodSpending),
      junkPercentage
    };
  }).reverse(); // Chronological order: Week 4, Week 3, Week 2, Week 1

  // Determine trend: compare Week 1 (most recent) percentage vs Week 4 (oldest) percentage
  const w1Pct = formattedWeeks[3].junkPercentage;
  const w4Pct = formattedWeeks[0].junkPercentage;

  let trend = "stable";
  if (w1Pct < w4Pct - 5) {
    trend = "improving";
  } else if (w1Pct > w4Pct + 5) {
    trend = "worsening";
  }

  return {
    weeks: formattedWeeks,
    trend
  };
};
