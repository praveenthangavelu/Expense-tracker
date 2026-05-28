import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const processedCodeRef = useRef(null);

  // Handle Google OAuth Callback redirect for Login page
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("code");
    if (code && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      const connect = async () => {
        const loadingToast = toast.loading("Logging in with Google...");
        try {
          await loginWithGoogle(code);
          toast.dismiss(loadingToast);
        } catch (err) {
          toast.dismiss(loadingToast);
          setError(err.message || "Failed to log in with Google");
          toast.error(err.message || "Failed to log in with Google");
        }
      };
      connect();
    }
  }, [location, loginWithGoogle]);

  const handleGoogleLogin = async () => {
    try {
      const res = await authService.getGoogleLoginUrl();
      if (res?.success && res.url) {
        if (res.url === "simulator") {
          toast.success("Simulator Mode Login triggered.");
          window.location.href = `${window.location.origin}/login?code=simulator`;
        } else {
          window.location.href = res.url;
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to initiate Google Login redirect");
    }
  };

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
              Welcome back
            </h1>
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              Sign in to continue tracking money.
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
                className="absolute right-4 top-[17px] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Remember & Forgot Row */}
          <div className="mt-5 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--border-focus)] focus:ring-offset-0 focus:outline-none"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="font-medium text-[var(--electric)] hover:brightness-110 transition-all"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" loading={loading} className="mt-7 w-full">
            Sign In
          </Button>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">or</span>
            <div className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
          </div>

          {/* Google Auth Option */}
          <Button
            type="button"
            variant="glass"
            size="lg"
            onClick={handleGoogleLogin}
            className="mt-6 w-full flex items-center justify-center gap-2.5"
          >
            {/* SVG Google Logo */}
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99C6.16 7.4 8.87 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.58h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.69-4.95 3.69-8.69z"
              />
              <path
                fill="#FBBC05"
                d="M5.24 14.29c-.25-.76-.39-1.57-.39-2.41 0-.84.14-1.65.39-2.41L1.39 6.48C.5 8.27 0 10.27 0 12s.5 3.73 1.39 5.52l3.85-3.23z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.13 0-5.84-2.36-6.76-5.51L1.39 16c1.98 3.91 5.96 6.56 10.61 6.56z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-8 text-center text-xs font-semibold text-[var(--text-secondary)]">
            New here?{" "}
            <Link to="/register" className="font-bold text-[var(--mint)] hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
