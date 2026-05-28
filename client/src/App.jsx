import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import ErrorBoundary from "./components/common/ErrorBoundary";
import Loader from "./components/common/Loader";
import Layout from "./components/layout/Layout";
import PrivateRoute from "./components/layout/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";
import { FamilyProvider } from "./context/FamilyContext";
import { TransactionProvider } from "./context/TransactionContext";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Family = lazy(() => import("./pages/Family"));
const Insights = lazy(() => import("./pages/Insights"));
const BudgetGoals = lazy(() => import("./pages/BudgetGoals"));
const GamificationProfile = lazy(() => import("./pages/GamificationProfile"));

import { PopupProvider } from "./context/PopupContext";
import PopupManager from "./components/popups/PopupManager";
import InstallPrompt from "./components/common/InstallPrompt";

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <FamilyProvider>
          <PopupProvider>
            <TransactionProvider>
              <InstallPrompt />
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  <Route
                    path="/dashboard"
                    element={
                      <Suspense fallback={<Loader label="Loading dashboard" />}>
                        <Dashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <Suspense fallback={<Loader label="Loading transactions" />}>
                        <Transactions />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/budget-goals"
                    element={
                      <Suspense fallback={<Loader label="Loading budget & goals" />}>
                        <BudgetGoals />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/family"
                    element={
                      <Suspense fallback={<Loader label="Loading family" />}>
                        <Family />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/insights"
                    element={
                      <Suspense fallback={<Loader label="Loading insights" />}>
                        <Insights />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <Suspense fallback={<Loader label="Loading settings" />}>
                        <Settings />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/gamification"
                    element={
                      <Suspense fallback={<Loader label="Loading gamification" />}>
                        <GamificationProfile />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>

              <PopupManager />

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  },
                  success: { iconTheme: { primary: "var(--mint)", secondary: "var(--bg-base)" } },
                  error: { iconTheme: { primary: "var(--flame)", secondary: "var(--bg-base)" } },
                }}
              />
            </TransactionProvider>
          </PopupProvider>
        </FamilyProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
