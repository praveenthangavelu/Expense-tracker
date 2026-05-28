import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import advisorService from "../services/advisorService";

// Import modular components
import FinancialHealthHero from "../components/insights/FinancialHealthHero";
import OverspendingAlerts from "../components/insights/OverspendingAlerts";
import SavingsOpportunities from "../components/insights/SavingsOpportunities";
import SpendingVelocity from "../components/insights/SpendingVelocity";
import SpendingPatterns from "../components/insights/SpendingPatterns";

export const Advisor = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFullAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const res = await advisorService.getFullAnalysis({ month, year });
      if (res?.success) {
        setAnalysis(res.data);
      } else {
        setError("Failed to retrieve spending analytics.");
      }
    } catch (err) {
      console.error("Failed to load full analysis", err);
      setError(err.message || "Unable to reach the advisor service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFullAnalysis();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-white/5 border-t-[var(--electric)] animate-spin" />
        <span className="text-sm text-[var(--text-secondary)] font-medium">
          Crunching your financial data...
        </span>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
        <div className="glass rounded-3xl p-8 border border-[var(--border-default)] max-w-md text-center space-y-4">
          <span className="text-4xl select-none">⚠️</span>
          <h3 className="font-headline text-lg font-bold text-white">Analysis Failed</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed select-text">
            {error || "An unexpected error occurred while analyzing spending history."}
          </p>
          <button
            onClick={fetchFullAnalysis}
            className="rounded-xl bg-[var(--electric)] text-white hover:bg-[#685ad6] px-5 py-2.5 text-xs font-bold transition-all"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const { overspending = [], savingsOpportunities = [], spendingVelocity = null, patterns = [], summary = null } = analysis;

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-[var(--electric)]" />
            Spending Advisor
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-body">
            Actionable intelligence derived from your spending patterns and family history.
          </p>
        </div>
        <button
          onClick={fetchFullAnalysis}
          className="rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-hover)] p-2.5 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Hero section */}
      {summary && <FinancialHealthHero summary={summary} />}

      {/* Pacing Racetrack */}
      {spendingVelocity && (
        <SpendingVelocity
          spendingVelocity={spendingVelocity}
          month={new Date().getMonth() + 1}
          year={new Date().getFullYear()}
        />
      )}

      {/* Grid of Alerts and Savings Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OverspendingAlerts overspending={overspending} />
        <SavingsOpportunities savingsOpportunities={savingsOpportunities} />
      </div>

      {/* Behavioral patterns */}
      <SpendingPatterns patterns={patterns} />
    </div>
  );
};

export default Advisor;
