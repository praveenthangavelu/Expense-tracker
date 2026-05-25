import { useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const titles = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/reports": "Reports",
  "/settings": "Settings",
};

const Topbar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0F1117]/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">ExpenseFlow</p>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            {titles[pathname] || "ExpenseFlow"}
          </h1>
        </div>
        <p className="hidden text-sm font-medium text-slate-300 sm:block">
          Hey, <span className="text-white">{user?.name?.split(" ")[0] || "there"}</span> 👋
        </p>
      </div>
    </header>
  );
};

export default Topbar;
