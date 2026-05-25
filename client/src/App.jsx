import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

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
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Family = lazy(() => import("./pages/Family"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Insights = lazy(() => import("./pages/Insights"));

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <FamilyProvider>
        <TransactionProvider>
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
                path="/recurring"
                element={
                  <Suspense fallback={<Loader label="Loading recurring transactions" />}>
                    <Recurring />
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
                path="/reports"
                element={
                  <Suspense fallback={<Loader label="Loading reports" />}>
                    <Reports />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1A1D27",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.08)",
              },
              success: { iconTheme: { primary: "#10B981", secondary: "#0F1117" } },
              error: { iconTheme: { primary: "#EF4444", secondary: "#0F1117" } },
            }}
          />
        </TransactionProvider>
      </FamilyProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
