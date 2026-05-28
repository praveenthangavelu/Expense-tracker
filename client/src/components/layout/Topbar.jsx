import { useState, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Search, Menu, Settings, LogOut, User, Keyboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationDropdown from "../common/NotificationDropdown";
import ThemeSwitchFlowGlass from "../ui/demo";
import { motion, AnimatePresence } from "framer-motion";

const PARENT_NAMES = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/budget-goals": "Budget & Goals",
  "/insights": "Insights",
  "/family": "Family Hub",
  "/settings": "Settings",
  "/gamification": "Gamification Profile",
};

const TAB_NAMES = {
  // Budget Goals
  monthly: "Monthly Plan",
  annual: "Annual Plan",
  goals: "Goals",
  recurring: "Recurring",
  rules: "Rules",
  // Insights
  overview: "Overview",
  advisor: "Advisor",
  health: "Health Score",
  reports: "Reports",
  // Settings
  profile: "Profile",
  categories: "Categories",
  automations: "Automations",
  import: "Import",
  privacy: "Privacy",
};

const Topbar = () => {
  const { pathname, search } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parse active tab from query params
  const queryParams = new URLSearchParams(search);
  const activeTab = queryParams.get("tab");

  const parentName = PARENT_NAMES[pathname] || "Overview";
  const tabName = activeTab ? TAB_NAMES[activeTab] : null;

  // Initials helper
  const initials = (name) => {
    const safeName = typeof name === "string" && name.trim() ? name.trim() : "User";
    return safeName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  };

  // Close profile dropdown on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileDropdownOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-navbar)] px-4 py-3 md:py-4 backdrop-blur-xl sm:px-6 lg:px-8 h-14 md:h-18 flex items-center justify-between">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
        
        {/* Left Side: Hamburger (Mobile) or Title/Breadcrumb (Desktop) */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu button on mobile */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))}
            aria-label="Toggle navigation drawer"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden outline-none"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {/* Breadcrumbs / Page Title */}
          <div>
            <div className="hidden items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-[var(--text-dim)] uppercase select-none md:flex">
              <Link to="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
                ExpenseFlow
              </Link>
              {pathname !== "/dashboard" && (
                <>
                  <span>&gt;</span>
                  <Link to={pathname} className="hover:text-[var(--text-primary)] transition-colors">
                    {parentName}
                  </Link>
                </>
              )}
              {tabName && (
                <>
                  <span>&gt;</span>
                  <span className="text-[var(--mint)]">{tabName}</span>
                </>
              )}
            </div>

            {/* Main Header title */}
            <h1 className="font-headline text-lg md:text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-tight mt-0.5">
              {tabName ? tabName : parentName}
            </h1>
          </div>
        </div>

        {/* Right Side: Global Palette Search, Notification Bell and Profile Dropdown */}
        <div className="flex items-center gap-3">
          {/* 1. Global Search Icon Trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            aria-label="Open command palette search"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all outline-none"
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          {/* 2. Notification bell dropdown */}
          <NotificationDropdown />

          {/* Theme switcher */}
          <ThemeSwitchFlowGlass />

          {/* 3. User Avatar and Profile Dropdown list (hidden on mobile) */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="View user profile actions"
              aria-expanded={profileDropdownOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--mint))] font-headline text-xs font-bold text-white shadow-sm hover:scale-105 transition-transform outline-none"
            >
              {initials(user?.name)}
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 z-50 w-48 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5 shadow-[var(--shadow-lg)]"
                >
                  <button
                    onClick={() => {
                      navigate("/gamification");
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors outline-none"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--mint)]" />
                    View Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate("/settings");
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors outline-none"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-command-palette"));
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors outline-none"
                  >
                    <Keyboard className="h-3.5 w-3.5 text-[var(--arctic)]" />
                    Keyboard Shortcuts
                  </button>

                  <div className="h-[1px] bg-[var(--border-subtle)] my-1" />

                  <button
                    onClick={() => {
                      logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--flame)] hover:bg-[var(--bg-hover)] transition-colors outline-none"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Topbar;
