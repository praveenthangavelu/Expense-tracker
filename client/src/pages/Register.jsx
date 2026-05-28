import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

const scorePassword = (password) =>
  [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

const Register = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const errors = {
    name: form.name.trim().length >= 2 ? "" : "Name must be at least 2 characters",
    email: /\S+@\S+\.\S+/.test(form.email) ? "" : "Enter a valid email",
    password: form.password.length >= 6 ? "" : "Password must be at least 6 characters",
    confirmPassword:
      form.confirmPassword === form.password ? "" : "Passwords do not match",
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (Object.values(errors).some(Boolean)) return;

    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden px-4 py-12 font-sans">
      {/* 1. Background Orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
        <div className="absolute -right-[10%] -top-[10%] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,var(--mint),transparent_70%)] blur-[100px]" style={{ opacity: "var(--orb-opacity)" }} />
        <div className="absolute -left-[10%] -bottom-[10%] h-[750px] w-[750px] rounded-full bg-[radial-gradient(circle,var(--electric),transparent_70%)] blur-[80px]" style={{ opacity: "calc(var(--orb-opacity) * 0.85)" }} />
      </div>

      {/* 2. Floating Background Glassmorphism Shapes */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
        <div className="absolute top-[18%] left-[12%] h-36 w-60 rounded-3xl bg-white/[0.015] border border-white/[0.03] backdrop-blur-md rotate-12 animate-[spin_60s_linear_infinite] opacity-40" />
        <div className="absolute bottom-[22%] right-[10%] h-48 w-48 rounded-[36px] bg-white/[0.01] border border-white/[0.025] backdrop-blur-sm -rotate-45 animate-[spin_80s_linear_infinite_reverse] opacity-35" />
        <div className="absolute top-[58%] right-[25%] h-24 w-72 rounded-2xl bg-white/[0.012] border border-white/[0.03] backdrop-blur-md rotate-45 animate-[spin_70s_linear_infinite] opacity-40" />
      </div>

      {/* 3. Noise Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 select-none" 
        style={{
          opacity: "var(--noise-opacity)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* 4. Dot Grid Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-10 select-none opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(var(--text-secondary) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Center Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative z-20 w-full max-w-[440px] rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-lg)] p-8 md:p-10"
      >
        <form onSubmit={submit}>
          {/* Logo Section */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--mint-gradient)] shadow-[var(--shadow-glow-mint)] rotate-45">
              <div className="h-2 w-2 rounded-[2px] bg-[var(--bg-surface)]" />
            </div>
            <span className="font-headline text-lg font-bold tracking-tight text-[var(--text-primary)] select-none">
              ExpenseFlow
            </span>
          </div>

          <div className="mt-8">
            <h1 className="font-headline text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Create account
            </h1>
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              Your dashboard is one minute away.
            </p>
          </div>

          {error && (
            <motion.div
              animate={{ x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
              className="mt-6 rounded-xl border border-[rgba(255,107,107,0.3)] bg-[var(--flame-soft)] p-3 text-xs font-semibold text-[var(--flame)]"
            >
              {error}
            </motion.div>
          )}

          {/* Form Fields */}
          <div className="mt-6 space-y-4">
            <Input
              label="Name"
              name="name"
              icon={User}
              value={form.name}
              onBlur={() => setTouched((value) => ({ ...value, name: true }))}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              error={touched.name && errors.name}
            />
            <Input
              label="Email"
              name="email"
              icon={Mail}
              value={form.email}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              error={touched.email && errors.email}
            />
            <Input
              label="Password"
              name="password"
              icon={Lock}
              type="password"
              value={form.password}
              onBlur={() => setTouched((value) => ({ ...value, password: true }))}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              error={touched.password && errors.password}
            />

            {/* Password Strength Indicator */}
            {form.password && (
              <div className="space-y-1.5 px-1">
                <div className="flex gap-[3px]">
                  {Array.from({ length: 4 }).map((_, index) => {
                    let active = index < Math.min(strength, 4);
                    let colorClass = "bg-white/10";
                    if (active) {
                      if (strength <= 1) colorClass = "bg-[var(--flame)]";
                      else if (strength === 2) colorClass = "bg-[var(--solar)]";
                      else colorClass = "bg-[var(--mint)]";
                    }
                    return (
                      <div
                        key={index}
                        className={clsx("h-[3px] flex-1 rounded-[2px] transition-colors duration-300", colorClass)}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Strength:{" "}
                  <span
                    className={clsx(
                      strength <= 1 && "text-[var(--flame)]",
                      strength === 2 && "text-[var(--solar)]",
                      strength >= 3 && "text-[var(--mint)]"
                    )}
                  >
                    {strength === 0 ? "Empty" : strength <= 1 ? "Weak" : strength === 2 ? "Fair" : strength === 3 ? "Strong" : "Very strong"}
                  </span>
                </p>
              </div>
            )}

            <Input
              label="Confirm password"
              name="confirmPassword"
              icon={Lock}
              type="password"
              value={form.confirmPassword}
              onBlur={() =>
                setTouched((value) => ({ ...value, confirmPassword: true }))
              }
              onChange={(event) =>
                setForm({ ...form, confirmPassword: event.target.value })
              }
              error={touched.confirmPassword && errors.confirmPassword}
            />
          </div>

          <Button type="submit" size="lg" loading={loading} className="mt-7 w-full">
            Create Account
          </Button>

          <p className="mt-8 text-center text-xs font-semibold text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[var(--mint)] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
