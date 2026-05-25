import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { authService } from "../services/authService";

/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext(null);

const TOKEN_KEY = "expenseflow_token";
const USER_KEY = "expenseflow_user";

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((nextUser, nextToken) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        const nextUser = response.data;
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [clearSession, token]);

  const login = useCallback(async (email, password) => {
    const response = await authService.login({ email, password });
    persistSession(response.data.user, response.data.token);
    toast.success("Welcome back");
    navigate("/dashboard", { replace: true });
  }, [navigate, persistSession]);

  const register = useCallback(async (name, email, password) => {
    const response = await authService.register({ name, email, password });
    persistSession(response.data.user, response.data.token);
    toast.success("Account created");
    navigate("/dashboard", { replace: true });
  }, [navigate, persistSession]);

  const logout = useCallback(() => {
    clearSession();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const updateUser = useCallback((data) => {
    const nextUser = { ...user, ...data };
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    toast.success("Profile updated locally");
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      register,
      logout,
      updateUser,
    }),
    [loading, login, logout, register, token, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
