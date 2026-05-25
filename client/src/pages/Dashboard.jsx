import { motion } from "framer-motion";

import BalanceCard from "../components/dashboard/BalanceCard";
import CategoryPieChart from "../components/dashboard/CategoryPieChart";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import FoodBreakdown from "../components/dashboard/FoodBreakdown";
import InsightCards from "../components/dashboard/InsightCards";
import BudgetAlert from "../components/common/BudgetAlert";
import { useTransactions } from "../context/TransactionContext";

const Dashboard = () => {
  const { summary } = useTransactions();
  const balance = summary?.balance || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  };

  return (
    <div className="space-y-6">
      <BudgetAlert />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="grid gap-4 md:grid-cols-3"
      >
        {[
          ["income", "Total Income", balance.totalIncome],
          ["expense", "Total Expense", balance.totalExpense],
          ["balance", "Balance", balance.balance],
        ].map(([type, label, amount]) => (
          <motion.div
            key={type}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <BalanceCard type={type} label={label} amount={amount} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <MonthlyChart />
        <CategoryPieChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InsightCards />
        <FoodBreakdown />
      </div>

      <RecentTransactions />
    </div>
  );
};

export default Dashboard;
