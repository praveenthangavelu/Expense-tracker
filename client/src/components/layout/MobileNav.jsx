import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Plus,
  Target,
  Menu,
  Camera,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  Users,
  Lightbulb,
  Settings as SettingsIcon,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import BottomSheet from "../common/BottomSheet";

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // Active indicator check
  const isTabActive = (path) => location.pathname === path;

  const handleQuickAction = (actionType) => {
    setAddSheetOpen(false);
    if (actionType === "expense") {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "expense" } })
      );
    } else if (actionType === "income") {
      window.dispatchEvent(
        new CustomEvent("open-transaction-form", { detail: { type: "income" } })
      );
    } else if (actionType === "scan") {
      window.dispatchEvent(new CustomEvent("open-receipt-scanner"));
    } else if (actionType === "import") {
      navigate("/settings?tab=import");
    }
  };

  const handleMoreNavigation = (path) => {
    setMoreSheetOpen(false);
    if (path === "search") {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* 5-Item Fixed Mobile Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-mobilenav)] px-3 py-1 backdrop-blur-xl md:hidden select-none">
        
        {/* 1. Home Tab */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-200 outline-none",
              isActive ? "text-[var(--mint)]" : "text-[var(--text-dim)]"
            )
          }
        >
          <LayoutDashboard className="h-5.5 w-5.5" />
          <span>Home</span>
          {isTabActive("/dashboard") && (
            <motion.span
              layoutId="mobile-nav-dot"
              className="h-1 w-1 rounded-full bg-[var(--mint)]"
            />
          )}
        </NavLink>

        {/* 2. Transactions Tab */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-200 outline-none",
              isActive ? "text-[var(--mint)]" : "text-[var(--text-dim)]"
            )
          }
        >
          <Receipt className="h-5.5 w-5.5" />
          <span>Trans</span>
          {isTabActive("/transactions") && (
            <motion.span
              layoutId="mobile-nav-dot"
              className="h-1 w-1 rounded-full bg-[var(--mint)]"
            />
          )}
        </NavLink>

        {/* 3. Center Elevated ADD Button */}
        <div className="relative flex flex-1 justify-center -top-3">
          <button
            type="button"
            onClick={() => setAddSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label="Add transaction options"
            className="flex h-13 w-13 items-center justify-center rounded-full bg-[var(--mint-gradient)] text-[#05060B] shadow-[var(--shadow-glow-mint)] outline-none active:scale-95 transition-transform"
          >
            <Plus className="h-6.5 w-6.5 stroke-[2.5px]" />
          </button>
        </div>

        {/* 4. Budget & Goals Tab */}
        <NavLink
          to="/budget-goals"
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-200 outline-none",
              isActive ? "text-[var(--mint)]" : "text-[var(--text-dim)]"
            )
          }
        >
          <Target className="h-5.5 w-5.5" />
          <span>Budget</span>
          {isTabActive("/budget-goals") && (
            <motion.span
              layoutId="mobile-nav-dot"
              className="h-1 w-1 rounded-full bg-[var(--mint)]"
            />
          )}
        </NavLink>

        {/* 5. More Hamburger Tab */}
        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          aria-haspopup="dialog"
          aria-label="More navigation links"
          className={clsx(
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors outline-none",
            moreSheetOpen ? "text-[var(--mint)]" : "text-[var(--text-dim)]"
          )}
        >
          <Menu className="h-5.5 w-5.5" />
          <span>More</span>
        </button>
      </nav>

      {/* ========================================================
          ADD ACTION SHEET (Mobile Bottom Sheet)
          ======================================================== */}
      <BottomSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="What would you like to do?"
        showClose={false}
      >
        <div className="space-y-2">
          <button
            onClick={() => handleQuickAction("expense")}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 text-sm font-semibold text-[var(--text-primary)] active:bg-[var(--bg-hover)] transition-all outline-none"
          >
            <ArrowUpRight className="h-5 w-5 text-[var(--flame)] shrink-0" />
            <div className="text-left">
              <p>Add Expense</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-normal mt-0.5">Log a manual debit transaction</p>
            </div>
          </button>

          <button
            onClick={() => handleQuickAction("income")}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 text-sm font-semibold text-[var(--text-primary)] active:bg-[var(--bg-hover)] transition-all outline-none"
          >
            <ArrowDownLeft className="h-5 w-5 text-[var(--mint)] shrink-0" />
            <div className="text-left">
              <p>Add Income</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-normal mt-0.5">Log a manual credit transaction</p>
            </div>
          </button>

          <button
            onClick={() => handleQuickAction("scan")}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 text-sm font-semibold text-[var(--text-primary)] active:bg-[var(--bg-hover)] transition-all outline-none"
          >
            <Camera className="h-5 w-5 text-[var(--arctic)] shrink-0" />
            <div className="text-left">
              <p>Scan Receipt</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-normal mt-0.5">Auto-fill using OCR smart receipt reader</p>
            </div>
          </button>

          <button
            onClick={() => handleQuickAction("import")}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] p-4 text-sm font-semibold text-[var(--text-primary)] active:bg-[var(--bg-hover)] transition-all outline-none"
          >
            <Upload className="h-5 w-5 text-[var(--solar)] shrink-0" />
            <div className="text-left">
              <p>Import from SMS / Files</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-normal mt-0.5">Upload patterns, CSV logs or copy text</p>
            </div>
          </button>

          <button
            onClick={() => setAddSheetOpen(false)}
            className="w-full text-center py-3.5 rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-secondary)] uppercase mt-2 transition-all outline-none"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      {/* ========================================================
          MORE NAVIGATION SHEET (Mobile Bottom Sheet)
          ======================================================== */}
      <BottomSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="More Navigation Options"
      >
        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => handleMoreNavigation("/family")}
            className={clsx(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all outline-none",
              isTabActive("/family")
                ? "border-[var(--mint)] bg-[var(--mint-soft)] text-[var(--mint)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] active:bg-[var(--bg-hover)]"
            )}
          >
            <Users className="h-5 w-5 text-[var(--electric)]" />
            <span className="text-xs font-bold">Family Hub</span>
          </button>

          <button
            onClick={() => handleMoreNavigation("/insights")}
            className={clsx(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all outline-none",
              isTabActive("/insights")
                ? "border-[var(--mint)] bg-[var(--mint-soft)] text-[var(--mint)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] active:bg-[var(--bg-hover)]"
            )}
          >
            <Lightbulb className="h-5 w-5 text-[var(--mint)]" />
            <span className="text-xs font-bold">Smart Insights</span>
          </button>

          <button
            onClick={() => handleMoreNavigation("/settings")}
            className={clsx(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all outline-none",
              isTabActive("/settings")
                ? "border-[var(--mint)] bg-[var(--mint-soft)] text-[var(--mint)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-secondary)] active:bg-[var(--bg-hover)]"
            )}
          >
            <SettingsIcon className="h-5 w-5 text-[var(--text-primary)]" />
            <span className="text-xs font-bold">Settings</span>
          </button>

          <button
            onClick={() => handleMoreNavigation("search")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 text-[var(--text-secondary)] active:bg-[var(--bg-hover)] outline-none"
          >
            <Search className="h-5 w-5 text-[var(--arctic)]" />
            <span className="text-xs font-bold">Search ({isMac ? "Cmd+K" : "Ctrl+K"})</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

export default MobileNav;
