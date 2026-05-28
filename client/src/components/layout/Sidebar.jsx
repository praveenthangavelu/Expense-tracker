import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Users,
  Lightbulb,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Crown,
} from "lucide-react";
import clsx from "clsx";

import { useAuth } from "../../context/AuthContext";
import gamificationService from "../../services/gamificationService";
import { LEVELS } from "../../utils/constants";

const LEVEL_STORAGE_KEY = "expenseflow_sidebar_level";
const COLLAPSE_STORAGE_KEY = "expenseflow_sidebar_collapsed";

const initials = (name) => {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "User";
  return safeName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [levelFlash, setLevelFlash] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Grouped sub-items
  const BUDGET_TABS = [
    { label: "Monthly Plan", tab: "monthly" },
    { label: "Annual Plan", tab: "annual" },
    { label: "Goals", tab: "goals" },
    { label: "Recurring", tab: "recurring" },
    { label: "Rules", tab: "rules" },
  ];

  const INSIGHTS_TABS = [
    { label: "Overview", tab: "overview" },
    { label: "Advisor", tab: "advisor" },
    { label: "Health Score", tab: "health" },
    { label: "Reports", tab: "reports" },
  ];

  const SETTINGS_TABS = [
    { label: "Profile", tab: "profile" },
    { label: "Categories", tab: "categories" },
    { label: "Automations", tab: "automations" },
    { label: "Import", tab: "import" },
    { label: "Privacy", tab: "privacy" },
  ];

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", path: "/transactions", icon: ReceiptText },
    {
      label: "Budget & Goals",
      path: "/budget-goals",
      icon: Target,
      tabs: BUDGET_TABS,
    },
    {
      label: "Family",
      path: "/family",
      icon: Users,
      isAdmin: user?.familyRole === "admin",
    },
    {
      label: "Insights",
      path: "/insights",
      icon: Lightbulb,
      tabs: INSIGHTS_TABS,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: Settings,
      tabs: SETTINGS_TABS,
    },
  ];

  // Dispatch layout update event on collapse state change
  const handleCollapseToggle = (targetState) => {
    setIsCollapsed(targetState);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(targetState));
    } catch {
      // Ignored
    }
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed: targetState } }));
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Keyboard shortcut listener to toggle sidebar
  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.detail?.collapsed !== undefined) {
        handleCollapseToggle(e.detail.collapsed);
      }
    };
    window.addEventListener("sidebar-toggle-trigger", handleShortcut);
    return () => window.removeEventListener("sidebar-toggle-trigger", handleShortcut);
  }, []);

  // Listen to mobile toggler events
  useEffect(() => {
    const handleMobileToggle = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener("toggle-mobile-sidebar", handleMobileToggle);
    return () => window.removeEventListener("toggle-mobile-sidebar", handleMobileToggle);
  }, []);

  useEffect(() => {
    // Notify on initial mount
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);

  // Load Gamification details
  useEffect(() => {
    let mounted = true;
    let flashTimeout;

    const fetchProfile = async () => {
      try {
        const res = await gamificationService.getProfile();
        if (!mounted || !res?.success) return;

        const nextProfile = res.data;
        if (nextProfile?.level) {
          const storageKey = `${LEVEL_STORAGE_KEY}:${user?.email || user?.name || "user"}`;
          const previousLevel = Number(localStorage.getItem(storageKey));

          localStorage.setItem(storageKey, String(nextProfile.level));

          if (previousLevel > 0 && nextProfile.level > previousLevel) {
            setLevelFlash(true);
            flashTimeout = window.setTimeout(() => {
              if (mounted) setLevelFlash(false);
            }, 500);
          }
        }

        setProfile(nextProfile);
      } catch (err) {
        console.error("Failed to load gamification profile", err);
      }
    };

    if (user) {
      fetchProfile();
    }

    return () => {
      mounted = false;
      if (flashTimeout) window.clearTimeout(flashTimeout);
    };
  }, [user]);

  const levelConfig = LEVELS.find((level) => level.level === profile?.level) || LEVELS[0];
  const levelColor = profile?.levelColor || levelConfig.color;
  const levelTitle = profile?.levelTitle || levelConfig.title;
  const xpPercentage = Math.min(
    100,
    Math.max(0, Number(profile?.xpProgress?.percentage || 0)),
  );

  return (
    <>
      {/* Mobile drawer backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-25 bg-black/60 backdrop-blur-xs md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        onDoubleClick={() => handleCollapseToggle(!isCollapsed)}
        role="navigation"
        aria-label="Main navigation"
        className={clsx(
          "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-0 py-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none",
          isCollapsed ? "w-16" : "w-60",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      {/* 1. Logo Block */}
      <div className={clsx("pb-6 transition-all duration-300", isCollapsed ? "px-4 text-center" : "px-6")}>
        <Link to="/dashboard" className="flex items-center gap-3">
          {/* Diamond App Icon */}
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[var(--mint-gradient)] shadow-[var(--shadow-glow-mint)] rotate-45 mx-auto">
            <div className="h-2 w-2 rounded-[2px] bg-[var(--sidebar-bg)]" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="font-headline text-lg font-bold tracking-tight text-[var(--text-primary)] select-none whitespace-nowrap"
              >
                ExpenseFlow
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <div className="mt-6 h-[1px] w-full bg-[var(--border-subtle)]" />
      </div>

      {/* 2. Navigation */}
      <div className="px-3 flex-1 overflow-y-auto mb-4 scrollbar-none">
        {!isCollapsed && (
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.2em] text-[var(--text-dim)] uppercase">
            Menu
          </p>
        )}
        <nav className="space-y-1 relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                className="relative"
                onMouseEnter={() => isCollapsed && setHoveredItem(item.label)}
                onMouseLeave={() => isCollapsed && setHoveredItem(null)}
              >
                <NavLink
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={({ isActive }) =>
                    clsx(
                      "group relative flex h-11 items-center rounded-xl transition-all duration-200 ease-out outline-none",
                      isCollapsed ? "justify-center px-0" : "px-4 gap-3",
                      isActive
                        ? "text-[var(--mint)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    )
                  }
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-[var(--sidebar-active-bg)] rounded-xl"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0.1 }
                          : { type: "spring", stiffness: 380, damping: 30 }
                      }
                    >
                      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[var(--mint)]" />
                    </motion.div>
                  )}
                  
                  <item.icon
                    className={clsx(
                      "h-[18px] w-[18px] relative z-10 transition-transform duration-200 group-hover:scale-105",
                      isActive ? "text-[var(--mint)]" : "text-current"
                    )}
                  />
                  
                  {!isCollapsed && (
                    <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                      {item.label}
                      {item.isAdmin && (
                        <Crown className="h-3 w-3 text-[var(--solar)] fill-[var(--solar)]" />
                      )}
                    </span>
                  )}
                </NavLink>

                {/* Collapsed flyout tooltip */}
                <AnimatePresence>
                  {isCollapsed && hoveredItem === item.label && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-14 top-0 z-50 w-44 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-lg)]"
                    >
                      <p className="px-2 py-1 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider select-none border-b border-[var(--border-subtle)] pb-1.5 mb-1 flex items-center gap-1">
                        {item.label}
                      </p>
                      {item.tabs ? (
                        <div className="space-y-0.5">
                          {item.tabs.map((tb) => (
                            <button
                              key={tb.tab}
                              type="button"
                              onClick={() => {
                                setHoveredItem(null);
                                navigate(`${item.path}?tab=${tb.tab}`);
                              }}
                              className="w-full text-left rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              · {tb.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHoveredItem(null);
                            navigate(item.path);
                          }}
                          className="w-full text-left rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Go to {item.label}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Collapse Toggle & Profile Card */}
      <div className="mt-auto px-3 relative space-y-3">
        {/* Collapse Toggle Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => handleCollapseToggle(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all outline-none"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="h-[1px] w-full bg-[var(--border-subtle)]" />
        
        <motion.button
          type="button"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          animate={
            levelFlash
              ? {
                  borderColor: ["var(--border-subtle)", `${levelColor}99`, "var(--border-subtle)"],
                  boxShadow: [
                    "0 0 0 rgba(0,0,0,0)",
                    `0 0 24px ${levelColor}66`,
                    "0 0 0 rgba(0,0,0,0)",
                  ],
                }
              : undefined
          }
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={clsx(
            "flex w-full flex-col rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-200 outline-none",
            isCollapsed ? "p-1.5 items-center" : "p-3"
          )}
        >
          <div className="flex w-full items-center gap-3">
             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--mint))] font-headline text-xs font-bold text-white shadow-[var(--shadow-glow-electric)]">
              {initials(user?.name)}
            </div>
            
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="truncate text-xs font-bold text-[var(--text-primary)]">{user?.name || "Username"}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                    {user?.familyRole === "admin" ? "Admin" : "Personal"}
                  </p>
                </div>
                <ChevronRight
                  className={clsx(
                    "h-3.5 w-3.5 text-[var(--text-dim)] transition-transform duration-200",
                    userDropdownOpen && "rotate-90",
                  )}
                />
              </>
            )}
          </div>

          {!isCollapsed && profile && (
            <div className="mt-3 w-full space-y-1.5 text-left">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                <span className="truncate">
                  {levelTitle}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-dim)]">
                  {Math.round(xpPercentage)}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--text-ghost)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${levelColor}80, ${levelColor})`,
                  }}
                />
              </div>
            </div>
          )}
        </motion.button>

        {/* User Dropdown */}
        <AnimatePresence>
          {userDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={clsx(
                "absolute z-40 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] p-1.5 shadow-[var(--shadow-lg)]",
                isCollapsed ? "bottom-16 left-12 w-32" : "bottom-16 left-3 right-3"
              )}
            >
              <button
                onClick={() => {
                  navigate("/settings");
                  setUserDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </button>
              <button
                onClick={() => {
                  logout();
                  setUserDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--flame)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
