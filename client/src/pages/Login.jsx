import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

const AuthArt = () => (
  <div className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#10131d] via-[#0F1117] to-[#141722] p-12 lg:flex lg:w-[55%] lg:flex-col lg:justify-between">
    <div className="absolute left-[12%] top-[18%] h-56 w-56 animate-drift rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="absolute bottom-[20%] right-[14%] h-64 w-64 animate-drift rounded-full bg-red-400/10 blur-3xl [animation-delay:5s]" />
    <div className="absolute right-[30%] top-[42%] h-48 w-48 animate-drift rounded-full bg-violet-400/10 blur-3xl [animation-delay:9s]" />

    <div className="relative z-10 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-glow">
        <Wallet className="h-7 w-7" />
      </div>
      <span className="font-display text-2xl font-extrabold text-white">
        ExpenseFlow
      </span>
    </div>

    <div className="relative z-10 max-w-xl">
      <h1 className="fluid-title font-display font-extrabold text-white">
        Track smarter. Spend wiser.
      </h1>
      <p className="mt-6 max-w-md text-lg text-slate-400">
        A premium finance cockpit for income, expenses, categories, and clarity.
      </p>
    </div>

    <div className="glass relative z-10 max-w-sm rounded-3xl p-5">
      <p className="text-sm text-slate-500">Current balance</p>
      <p className="amount mt-2 text-4xl font-bold text-white">₹45,230</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
          +₹62,000 income
        </div>
        <div className="rounded-2xl bg-red-400/10 p-3 text-red-300">
          -₹16,770 spent
        </div>
      </div>
    </div>
  </div>
);

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const errors = {
    email: /\S+@\S+\.\S+/.test(form.email) ? "" : "Enter a valid email",
    password: form.password.length >= 6 ? "" : "Password must be at least 6 characters",
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (errors.email || errors.password) return;

    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F1117]">
      <AuthArt />
      <main className="flex flex-1 items-center justify-center p-6 lg:w-[45%]">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="w-full max-w-md"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">
            Finance Noir
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-slate-400">Sign in to continue tracking money.</p>

          {error && (
            <motion.div
              animate={{ x: [0, -8, 8, -4, 4, 0] }}
              className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200"
            >
              {error}
            </motion.div>
          )}

          <div className="mt-8 space-y-4">
            <Input
              label="Email"
              name="email"
              icon={Mail}
              value={form.email}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              error={touched.email && errors.email}
            />
            <div className="relative">
              <Input
                label="Password"
                name="password"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onBlur={() => setTouched((value) => ({ ...value, password: true }))}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                error={touched.password && errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-4 top-4 text-slate-500 hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm({ ...form, remember: event.target.checked })}
              className="rounded border-white/10 bg-white/[0.04] text-emerald-400 focus:ring-emerald-400"
            />
            Remember me
          </label>

          <Button type="submit" size="lg" loading={loading} className="mt-7 w-full">
            Sign In
          </Button>

          <p className="mt-6 text-center text-sm text-slate-400">
            New here?{" "}
            <Link to="/register" className="font-semibold text-emerald-300">
              Create account
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
};

export default Login;
