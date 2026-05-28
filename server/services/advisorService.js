import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import { getHealthScore, getJunkFoodTrend } from "./healthService.js";

/**
 * Perform all 7 financial analyses for a user
 */
export const analyzeSpending = async (userId, month, year) => {
  const now = new Date();
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = year || now.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const startOfNextMonth = new Date(currentYear, currentMonth, 1);

  // Helper: Get previous 3 months ranges
  const getPrevMonthBoundaries = (offset) => {
    let targetMonth = currentMonth - offset;
    let targetYear = currentYear;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 1);
    return { start, end };
  };

  const prev1 = getPrevMonthBoundaries(1);
  const prev2 = getPrevMonthBoundaries(2);
  const prev3 = getPrevMonthBoundaries(3);

  // Fetch all required data concurrently
  const [
    thisMonthTx,
    prevMonthTx,
    prev3MonthsTx,
    budget,
    recurringTx,
    healthData,
    trendData,
    expenseTransactionsOrdered
  ] = await Promise.all([
    // This month expenses
    Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lt: startOfNextMonth }
    }),
    // Last month expenses (for fallback comparison)
    Transaction.find({
      user: userId,
      date: { $gte: prev1.start, $lt: prev1.end }
    }),
    // Previous 3 months expenses grouped by category
    Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: "expense",
          date: { $gte: prev3.start, $lt: prev1.end } // covers 3 months
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]),
    // Current budget
    Budget.findOne({
      user: userId,
      month: currentMonth,
      year: currentYear
    }),
    // Active recurring transactions
    RecurringTransaction.find({
      user: userId,
      isActive: true,
      type: "expense"
    }),
    // Health score
    getHealthScore(userId, currentMonth, currentYear),
    // Junk food trend
    getJunkFoodTrend(userId),
    // Expense transactions ordered for streak calculation
    Transaction.find({
      user: userId,
      type: "expense"
    }).sort({ date: 1 }).select("date")
  ]);

  const thisMonthExpenses = thisMonthTx.filter(t => t.type === "expense");
  const thisMonthIncomes = thisMonthTx.filter(t => t.type === "income");

  const totalExpense = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = thisMonthIncomes.reduce((sum, t) => sum + t.amount, 0);

  // ----------------------------------------------------
  // 1. OVERSPENDING DETECTION
  // ----------------------------------------------------
  // Calculate current month category spending
  const currentCategoryTotals = {};
  thisMonthExpenses.forEach(t => {
    currentCategoryTotals[t.category] = (currentCategoryTotals[t.category] || 0) + t.amount;
  });

  // Calculate 3-month average per category
  const categoryAverages = {};
  prev3MonthsTx.forEach(item => {
    categoryAverages[item._id] = item.total / 3;
  });

  const overspending = [];
  Object.entries(currentCategoryTotals).forEach(([category, currentSpend]) => {
    const averageSpend = categoryAverages[category] || 0;
    
    // Only flag if current > 130% of average and average is non-trivial, or if it's a large spend
    const threshold = averageSpend > 0 ? averageSpend * 1.3 : 1000;
    if (currentSpend > threshold && currentSpend > 500) {
      let suggestion = `Your ${category} spending is ₹${Math.round(currentSpend - averageSpend)} above your usual. Consider reviewing this category.`;
      if (category === "Food") {
        suggestion = `Your food spending is ₹${Math.round(currentSpend - averageSpend)} above your usual. Consider meal prepping 2 days this week.`;
      } else if (category === "Entertainment") {
        suggestion = `Entertainment is up ${averageSpend > 0 ? Math.round((currentSpend/averageSpend - 1)*100) : 100}%. Try free alternatives: parks, home movie nights, library.`;
      } else if (category === "Shopping") {
        suggestion = `₹${Math.round(currentSpend)} in shopping this month — try a 48-hour rule: wait 2 days before non-essential purchases.`;
      } else if (category === "Transport") {
        suggestion = `Transport costs up ${averageSpend > 0 ? Math.round((currentSpend/averageSpend - 1)*100) : 100}%. Consider carpooling or public transport for routine trips.`;
      }

      overspending.push({
        category,
        currentSpend: Math.round(currentSpend),
        averageSpend: Math.round(averageSpend),
        overBy: Math.round(currentSpend - averageSpend),
        overByPercent: averageSpend > 0 ? Math.round((currentSpend / averageSpend - 1) * 100) : 100,
        suggestion
      });
    }
  });

  // ----------------------------------------------------
  // 2. SAVINGS OPPORTUNITY FINDER
  // ----------------------------------------------------
  // Sort current categories by total spending descending
  const sortedCurrentCategories = Object.entries(currentCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // top 3

  const savingsOpportunities = sortedCurrentCategories.map(([category, currentSpend]) => {
    const potentialSaving = Math.round(currentSpend * 0.2);
    const reducedSpend = Math.round(currentSpend * 0.8);
    
    let actionableTip = `Cutting ${category} by 20% saves ₹${potentialSaving}/month. Try setting a budget category limit next month.`;
    if (category === "Food") {
      actionableTip = `Cutting Food by 20% = ₹${potentialSaving}/month. That's ₹${potentialSaving * 12}/year — enough for a weekend trip.`;
    } else if (category === "Shopping") {
      actionableTip = `Reducing Shopping by 20% = ₹${potentialSaving}/month. Try buying high-quality second-hand items or waiting for sales.`;
    } else if (category === "Entertainment") {
      actionableTip = `Reducing Entertainment by 20% = ₹${potentialSaving}/month. Share streaming services with family to cut costs.`;
    } else if (category === "Bills") {
      actionableTip = `Reducing Bills by 20% = ₹${potentialSaving}/month. Turn off unplugged electronics or compare service provider rates.`;
    }

    // Special check for Online Delivery subcategory
    const onlineDeliverySpend = thisMonthExpenses
      .filter(t => t.category === "Food" && t.subCategory === "Online Food Delivery")
      .reduce((sum, t) => sum + t.amount, 0);
    if (category === "Food" && onlineDeliverySpend > currentSpend * 0.3) {
      actionableTip = `Reducing Online Delivery by 20% = ₹${Math.round(onlineDeliverySpend * 0.2)}/month. Cook just 2 extra meals/week to hit this.`;
    }

    return {
      category,
      currentSpend: Math.round(currentSpend),
      reducedSpend,
      potentialSaving,
      actionableTip
    };
  });

  // ----------------------------------------------------
  // 3. SPENDING VELOCITY
  // ----------------------------------------------------
  const dayOfMonth = now.getMonth() + 1 === currentMonth ? now.getDate() : 28; // fallback to 28 if viewing historical
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dailyRate = Math.round(totalExpense / Math.max(1, dayOfMonth));
  const projectedTotal = dailyRate * daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

  let budgetLimit = budget?.overall || 0;
  let onTrack = true;
  let message = "";

  if (budgetLimit > 0) {
    onTrack = projectedTotal <= budgetLimit;
    const diff = Math.abs(projectedTotal - budgetLimit);
    if (onTrack) {
      message = `At ₹${dailyRate}/day, you'll spend ₹${projectedTotal} by month end — that's ₹${diff} under your budget.`;
    } else {
      message = `At ₹${dailyRate}/day, you'll spend ₹${projectedTotal} by month end — that's ₹${diff} over your budget.`;
    }
  } else {
    // If no budget, compare to last month expense
    const lastMonthExpenseTotal = prevMonthTx.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    if (lastMonthExpenseTotal > 0) {
      onTrack = projectedTotal <= lastMonthExpenseTotal;
      const diff = Math.abs(projectedTotal - lastMonthExpenseTotal);
      if (onTrack) {
        message = `At ₹${dailyRate}/day, you'll spend ₹${projectedTotal} by month end — that's ₹${diff} less than last month.`;
      } else {
        message = `At ₹${dailyRate}/day, you'll spend ₹${projectedTotal} by month end — that's ₹${diff} more than last month.`;
      }
    } else {
      onTrack = true;
      message = `At ₹${dailyRate}/day, you're projected to spend ₹${projectedTotal} by month end. Set a budget to track targets.`;
    }
  }

  // ----------------------------------------------------
  // 4. SMART REALLOCATION
  // ----------------------------------------------------
  const reallocation = [];
  
  // Find category underspent amount (either compared to budget limit or below average)
  if (budget && budget.categories && budget.categories.length > 0) {
    budget.categories.forEach(bud => {
      const exp = currentCategoryTotals[bud.category] || 0;
      const saved = bud.limit - exp;
      // If we are past the 15th and underspent by > 500, suggest redirecting
      if (saved > 500 && dayOfMonth > 15) {
        const dest = bud.category === "Entertainment" ? "Emergency Fund" : "Investment";
        const reason = bud.category === "Entertainment"
          ? `You're underspending on entertainment — redirect ₹${Math.round(saved)} to savings while the habit lasts.`
          : `Great job on ${bud.category}! Consider putting the ₹${Math.round(saved)} saved into a SIP.`;

        reallocation.push({
          from: bud.category,
          to: dest,
          amount: Math.round(saved),
          reason
        });
      }
    });
  } else {
    // No budget, check compared to 3-month average
    Object.entries(categoryAverages).forEach(([cat, avg]) => {
      const exp = currentCategoryTotals[cat] || 0;
      const saved = avg - exp;
      if (saved > 500 && dayOfMonth > 15) {
        const dest = cat === "Entertainment" || cat === "Transport" ? "Emergency Fund" : "Investment";
        const reason = cat === "Entertainment"
          ? `You're underspending on entertainment — redirect ₹${Math.round(saved)} to savings while the habit lasts.`
          : `Great job on ${cat}! Consider putting the ₹${Math.round(saved)} saved into a SIP.`;

        reallocation.push({
          from: cat,
          to: dest,
          amount: Math.round(saved),
          reason
        });
      }
    });
  }

  // If no reallocation matches, provide a general fallback suggestion
  if (reallocation.length === 0) {
    reallocation.push({
      from: "General Savings",
      to: "SIP Investment",
      amount: 1000,
      reason: "Start a recurring SIP of ₹1,000 to automate wealth building without manual tracking."
    });
  }

  // ----------------------------------------------------
  // 5. RECURRING EXPENSE AUDIT
  // ----------------------------------------------------
  const recurringAudit = recurringTx.map(rec => {
    let monthlyAmount = rec.amount;
    if (rec.frequency === "daily") monthlyAmount = rec.amount * 30;
    else if (rec.frequency === "weekly") monthlyAmount = rec.amount * 4.3;
    else if (rec.frequency === "biweekly") monthlyAmount = rec.amount * 2.15;
    else if (rec.frequency === "yearly") monthlyAmount = rec.amount / 12;

    const annualAmount = monthlyAmount * 12;
    const name = rec.note || rec.category;

    return {
      name,
      monthlyAmount: Math.round(monthlyAmount),
      annualAmount: Math.round(annualAmount),
      suggestion: `₹${Math.round(monthlyAmount)}/month on ${name} = ₹${Math.round(annualAmount)}/year. Still using it regularly?`
    };
  });

  // ----------------------------------------------------
  // 6. SPENDING PATTERN ALERTS
  // ----------------------------------------------------
  const patterns = [];

  // Impulse purchases (transactions < 150)
  const impulseTx = thisMonthExpenses.filter(t => t.amount < 150);
  if (impulseTx.length >= 5) {
    const totalImpulse = impulseTx.reduce((sum, t) => sum + t.amount, 0);
    patterns.push({
      pattern: "impulse",
      description: `You made ${impulseTx.length} transactions under ₹150 this month`,
      frequency: impulseTx.length,
      advice: `Small purchases add up. You've spent ₹${Math.round(totalImpulse)} on sub-₹150 items this month.`
    });
  }

  // Late-night purchases (after 10 PM)
  const lateNightTx = thisMonthExpenses.filter(t => {
    const hour = new Date(t.date).getHours();
    return hour >= 22 || hour <= 4;
  });
  if (lateNightTx.length >= 3) {
    patterns.push({
      pattern: "late_night",
      description: `${lateNightTx.length} transactions after 10 PM this month`,
      frequency: lateNightTx.length,
      advice: "Late-night orders tend to be impulse buys. Try a 'no ordering after 9 PM' rule."
    });
  }

  // Weekend splurge percentage
  const weekendSpend = thisMonthExpenses
    .filter(t => {
      const d = new Date(t.date).getDay();
      return d === 0 || d === 6; // Sunday=0, Saturday=6
    })
    .reduce((sum, t) => sum + t.amount, 0);
  const weekdaySpend = totalExpense - weekendSpend;
  if (weekendSpend > weekdaySpend * 0.4 && weekendSpend > 500) {
    const pct = Math.round((weekendSpend / (totalExpense || 1)) * 100);
    patterns.push({
      pattern: "weekend_spike",
      description: `Weekend spending is ${pct}% of your total spending`,
      frequency: pct,
      advice: "Plan weekend activities in advance — budgeted fun is still fun."
    });
  }

  // If no patterns detected, push a general one
  if (patterns.length === 0) {
    patterns.push({
      pattern: "trend",
      description: "Consistent spending patterns",
      frequency: 0,
      advice: "Your spending velocity matches standard healthy indicators. Keep maintaining the discipline!"
    });
  }

  // ----------------------------------------------------
  // 7. FINANCIAL HEALTH SUMMARY
  // ----------------------------------------------------
  // Component 1: Savings Rate (30%)
  const savingsRatePct = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const savingsScore = Math.max(0, Math.min(100, savingsRatePct * 2)); // 50% rate = 100 score

  // Component 2: Budget Adherence (25%)
  let budgetScore = 100;
  if (budgetLimit > 0 && totalExpense > budgetLimit) {
    budgetScore = Math.max(0, 100 - ((totalExpense - budgetLimit) / budgetLimit) * 100);
  } else if (budgetLimit === 0) {
    budgetScore = 80; // default if no budget set
  }

  // Component 3: Consistency (20%)
  let logStreak = 0;
  if (expenseTransactionsOrdered.length >= 3) {
    const dates = [...new Set(expenseTransactionsOrdered.map(t => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }))].sort();
    let currentStreak = 1;
    let maxStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) currentStreak++;
      else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    logStreak = Math.max(maxStreak, currentStreak);
  }
  const consistencyScore = Math.min(100, logStreak * 10);

  // Component 4: Health Score (15%)
  const healthScore = healthData.score || 100;

  // Component 5: Trend Score (10%)
  let trendScore = 80;
  if (trendData.trend === "improving") trendScore = 100;
  else if (trendData.trend === "worsening") trendScore = 50;

  // Calculate final score
  const finalScore = Math.round(
    savingsScore * 0.3 +
    budgetScore * 0.25 +
    consistencyScore * 0.2 +
    healthScore * 0.15 +
    trendScore * 0.1
  );

  // Map to Grade
  let grade = "D";
  if (finalScore >= 90) grade = "A+";
  else if (finalScore >= 80) grade = "A";
  else if (finalScore >= 70) grade = "B+";
  else if (finalScore >= 60) grade = "B";
  else if (finalScore >= 50) grade = "C";

  // Strengths and Weaknesses
  const strengths = [];
  const weaknesses = [];

  if (savingsRatePct > 20) strengths.push("Strong savings rate this month.");
  else weaknesses.push("Low savings rate. Try cutting non-essential costs.");

  if (budgetScore > 90) strengths.push("Excellent budget discipline.");
  else weaknesses.push("Exceeding planned budget limits.");

  if (consistencyScore > 70) strengths.push("Highly consistent expense logging.");
  else weaknesses.push("Inconsistent logging habits. Try tracking daily.");

  if (healthScore > 70) strengths.push("Great eating habits, low junk spend.");
  else weaknesses.push("High junk food spending. Swap with home alternatives.");

  const topStrength = strengths[0] || "Active expense tracking habit.";
  const topWeakness = weaknesses[0] || "No budgets set for core categories.";

  // Action item
  let oneActionItem = "Set a strict monthly overall budget to regulate daily burn rates.";
  if (weaknesses.includes("High junk food spending. Swap with home alternatives.")) {
    const foodDeliveryAmt = thisMonthExpenses
      .filter(t => t.category === "Food" && t.subCategory === "Online Food Delivery")
      .reduce((sum, t) => sum + t.amount, 0);
    oneActionItem = `Your biggest win would be reducing Food Delivery by ₹${Math.round(foodDeliveryAmt * 0.3)}. That alone improves your score by 8 points.`;
  } else if (overspending.length > 0) {
    const topOver = overspending.sort((a,b) => b.overBy - a.overBy)[0];
    oneActionItem = `Target your ${topOver.category} category. Reducing it by ₹${Math.round(topOver.overBy * 0.5)} next month balances your ratios.`;
  } else if (totalIncome === 0) {
    oneActionItem = "Log your monthly income source to activate proper savings rate metrics.";
  }

  return {
    overspending,
    savingsOpportunities,
    spendingVelocity: {
      dailyRate,
      projectedTotal,
      daysRemaining,
      onTrack,
      message
    },
    reallocation,
    recurringAudit,
    patterns,
    summary: {
      score: finalScore,
      grade,
      topStrength,
      topWeakness,
      oneActionItem
    }
  };
};
