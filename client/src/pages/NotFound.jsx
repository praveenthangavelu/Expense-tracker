import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const NotFound = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-void)] p-6 text-center">
    {/* Background mesh glow layers */}
    <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-[var(--mint-glow)] blur-3xl opacity-40 animate-pulse pointer-events-none" />
    <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-[var(--electric-glow)] blur-3xl opacity-30 pointer-events-none" />

    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative z-10"
    >
      <h1 className="bg-gradient-to-r from-[var(--mint)] to-[var(--electric)] bg-clip-text font-display text-8xl font-bold text-transparent tracking-tighter sm:text-9xl">
        404
      </h1>
      <p className="mt-4 font-display text-2xl font-bold text-white tracking-tight">
        Void Detected
      </p>
      <p className="mt-2 text-xs text-[var(--text-secondary)] font-medium max-w-sm mx-auto leading-relaxed">
        The resource you are trying to query does not exist or has been archived outside the ledger.
      </p>
      <div className="mt-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--mint-gradient)] px-6 py-3 text-xs font-bold text-slate-950 shadow-[var(--shadow-glow-mint)] hover:brightness-105 transition-all select-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back to Ledger
        </Link>
      </div>
    </motion.div>
  </div>
);

export default NotFound;
