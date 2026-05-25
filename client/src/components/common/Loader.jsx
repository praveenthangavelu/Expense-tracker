import { motion } from "framer-motion";
import { Wallet } from "lucide-react";

const Loader = ({ label = "Loading ExpenseFlow" }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400 text-slate-950 shadow-glow">
        <Wallet className="h-8 w-8" />
      </div>
      <p className="font-display text-xl font-bold text-white">{label}</p>
      <div className="mx-auto mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full w-1/2 rounded-full bg-emerald-400"
          animate={{ x: ["-100%", "220%"] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  </div>
);

export default Loader;
