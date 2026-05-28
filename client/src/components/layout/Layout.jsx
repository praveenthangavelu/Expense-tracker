import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";
import CommandPalette from "../common/CommandPalette";
import TransactionForm from "../transactions/TransactionForm";
import FloatingActionButton from "../common/FloatingActionButton";
import SkipToContent from "../common/SkipToContent";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useTheme } from "../../hooks/useTheme";

const Layout = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const [hoverSupported, setHoverSupported] = useState(false);
  const { isDark } = useTheme();

  // Layout & Modal States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [transactionFormConfig, setTransactionFormConfig] = useState({
    isOpen: false,
    type: "expense",
    transaction: null,
    openScanner: false,
  });

  // Listen to sidebar collapse event
  useEffect(() => {
    const handleCollapseChange = (e) => {
      if (e.detail?.collapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.collapsed);
      }
    };
    window.addEventListener("sidebar-collapse-change", handleCollapseChange);
    return () => window.removeEventListener("sidebar-collapse-change", handleCollapseChange);
  }, []);

  // Listen to global layout form openers
  useEffect(() => {
    const handleOpenForm = (e) => {
      setTransactionFormConfig({
        isOpen: true,
        type: e.detail?.type || "expense",
        transaction: e.detail?.transaction || null,
        openScanner: e.detail?.openScanner || false,
      });
    };
    const handleOpenPalette = () => {
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener("open-transaction-form", handleOpenForm);
    window.addEventListener("open-command-palette", handleOpenPalette);

    return () => {
      window.removeEventListener("open-transaction-form", handleOpenForm);
      window.removeEventListener("open-command-palette", handleOpenPalette);
    };
  }, []);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onCmdK: () => setIsCommandPaletteOpen((prev) => !prev),
    onCmdB: () => {
      const stored = localStorage.getItem("expenseflow_sidebar_collapsed");
      const current = stored ? JSON.parse(stored) : false;
      window.dispatchEvent(
        new CustomEvent("sidebar-toggle-trigger", { detail: { collapsed: !current } })
      );
    },
    onN: () => {
      setTransactionFormConfig({
        isOpen: true,
        type: "expense",
        transaction: null,
        openScanner: false,
      });
    },
    onI: () => {
      setTransactionFormConfig({
        isOpen: true,
        type: "income",
        transaction: null,
        openScanner: false,
      });
    },
    onS: () => {
      setTransactionFormConfig({
        isOpen: true,
        type: "expense",
        transaction: null,
        openScanner: true,
      });
    },
    onEsc: () => {
      setIsCommandPaletteOpen(false);
      setTransactionFormConfig((prev) => ({ ...prev, isOpen: false }));
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHoverSupported(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
      
      const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* Accessibility jump link */}
      <SkipToContent />

      {/* 1. Gradient Mesh Background Layers */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        {/* Mint Glow Orb (Top-Right) */}
        <div 
          className="absolute -right-[10%] -top-[10%] h-[750px] w-[750px] rounded-full bg-[radial-gradient(circle,var(--mint),transparent_70%)] blur-[90px] animate-[drift-mint_40s_infinite_alternate_ease-in-out]" 
          style={{ opacity: "var(--orb-opacity)" }}
        />
        
        {/* Electric Glow Orb (Bottom-Left) */}
        <div 
          className="absolute -left-[10%] -bottom-[10%] h-[750px] w-[750px] rounded-full bg-[radial-gradient(circle,var(--electric),transparent_70%)] blur-[90px] animate-[drift-electric_35s_infinite_alternate_ease-in-out]" 
          style={{ opacity: "var(--orb-opacity)" }}
        />
        
        {/* Flame Glow Orb (Center) */}
        <div 
          className="absolute left-[30%] top-[25%] h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,var(--flame),transparent_70%)] blur-[80px] animate-[pulse-flame_25s_infinite_alternate_ease-in-out]" 
          style={{ opacity: "calc(var(--orb-opacity) * 0.4)" }}
        />
      </div>

      {/* 2. Glow Cursor Spot Light */}
      {hoverSupported && mousePos.x !== -999 && !shouldReduceMotion && (
        <div
          className="pointer-events-none fixed z-10 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--mint-glow),transparent_70%)]"
          style={{ 
            left: mousePos.x, 
            top: mousePos.y,
            opacity: isDark ? 1 : 0.4
          }}
        />
      )}

      {/* 3. Noise Overlay Layer */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 select-none" 
        style={{
          opacity: "var(--noise-opacity)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Main Layout Grid */}
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        
        {/* Dynamic Margin Content container */}
        <div
          className={clsx(
            "flex flex-1 flex-col pb-24 md:pb-0 min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isSidebarCollapsed ? "md:ml-16" : "md:ml-60"
          )}
        >
          <Topbar />
          <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Global Interactive Elements */}
      <MobileNav />
      <FloatingActionButton />
      
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <TransactionForm
        isOpen={transactionFormConfig.isOpen}
        onClose={() => setTransactionFormConfig((prev) => ({ ...prev, isOpen: false }))}
        transaction={transactionFormConfig.transaction}
        defaultType={transactionFormConfig.type}
        openScanner={transactionFormConfig.openScanner}
      />
    </div>
  );
};

export default Layout;
