import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";
import toast from "react-hot-toast";

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

const labels = ["Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-emerald-400"];

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
    <div className="flex min-h-screen bg-[#0F1117]">
      <aside className="relative hidden min-h-screen overflow-hidden p-12 lg:flex lg:w-[55%] lg:flex-col lg:justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-red-400/10" />
        <div className="absolute left-20 top-24 h-72 w-72 animate-drift rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-24 right-20 h-72 w-72 animate-drift rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-2xl font-extrabold text-emerald-300">
            ExpenseFlow
          </p>
          <h1 className="fluid-title mt-8 font-display font-extrabold text-white">
            Build your money command center.
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Register once, track every rupee, and turn spending patterns into decisions.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 lg:w-[45%]">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="w-full max-w-md"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">
            Start free
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white">
            Create account
          </h1>
          <p className="mt-2 text-slate-400">Your dashboard is one minute away.</p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
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

            <div>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full ${
                      index < strength ? colors[Math.max(strength - 1, 0)] : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Strength: {labels[strength]}
              </p>
            </div>

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

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-emerald-300">
              Sign in
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
};

export default Register;
