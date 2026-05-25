import { Link, NavLink } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Wallet,
  Repeat,
  Users,
  Lightbulb,
  Crown,
} from "lucide-react";
import clsx from "clsx";

import { useAuth } from "../../context/AuthContext";

const initials = (name = "User") =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const NavItem = ({ item, mobile = false }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      clsx(
        "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
        mobile && "flex-1 flex-shrink-0 flex-col gap-1 rounded-none px-1 py-2 text-[10px] min-w-[55px]",
        isActive
          ? "bg-emerald-400/10 text-emerald-300"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
      )
    }
  >
    {({ isActive }) => (
      <>
        {!mobile && isActive && (
          <span className="absolute left-0 h-8 w-1 rounded-r-full bg-emerald-400" />
        )}
        <div className="relative">
          <item.icon className={clsx("h-5 w-5", isActive && "drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]")} />
          {mobile && item.isAdmin && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 p-0.5">
              <Crown className="h-2 w-2 text-slate-950 fill-slate-950" />
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5">
          {item.label}
          {!mobile && item.isAdmin && (
            <Crown className="h-4 w-4 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
          )}
        </span>
      </>
    )}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", path: "/transactions", icon: ReceiptText },
    { label: "Recurring", path: "/recurring", icon: Repeat },
    {
      label: "Family",
      path: "/family",
      icon: Users,
      isAdmin: user?.familyRole === "admin",
    },
    { label: "Insights", path: "/insights", icon: Lightbulb },
    { label: "Reports", path: "/reports", icon: BarChart3 },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      <aside className="glass fixed left-0 top-0 z-30 hidden h-screen w-[260px] flex-col border-y-0 border-l-0 px-4 py-5 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-glow">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold text-white">
              ExpenseTracker
            </p>
            <p className="text-xs text-slate-500">By Praveen</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 font-bold text-slate-950">
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <nav className="glass fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-x-0 border-b-0 md:hidden scrollbar-none">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} mobile />
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
