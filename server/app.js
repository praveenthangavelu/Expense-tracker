// Middleware execution order (order matters for security and performance):
// 1. helmet         — sets security HTTP headers before anything else
// 2. cors           — validates origin
// 3. rate limiters  — reject abusive clients before we parse their body
// 4. body parsing   — only after rate limit checks pass
// 5. mongoSanitize  — strip NoSQL injection chars from parsed body/query
// 6. hpp            — strip duplicate query params
// 7. compression    — gzip outgoing responses
// 8. requestLogger  — log after all middleware is set up, before routes
// 9. routes         — business logic
// 10. 404 handler
// 11. errorHandler  — must be last (Express detects 4-arg signature)

import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "./middleware/mongoSanitize.js";
import hpp from "hpp";
import compression from "compression";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import familyRoutes from "./routes/familyRoutes.js";
import subCategoryRoutes from "./routes/subCategoryRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import popupRoutes from "./routes/popupRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import advisorRoutes from "./routes/advisorRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import annualPlanRoutes from "./routes/annualPlanRoutes.js";
import monthlyPlanRoutes from "./routes/monthlyPlanRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import categorizeRoutes from "./routes/categorizeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";

import errorHandler from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { cache } from "./utils/cache.js";
import { perfMonitor } from "./utils/perfMonitor.js";

const app = express();

// ─── 1. Security Headers ──────────────────────────────────────────────────────
// helmet sets 15+ HTTP headers that protect against common web vulnerabilities:
//   X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
app.use(helmet());

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman in dev).
      if (!origin) return callback(null, true);
      // Allow the configured frontend URL and any localhost port in development.
      if (
        origin === process.env.CLIENT_URL ||
        /^https?:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // Cache preflight response for 24 hours
  })
);

// ─── 3. Rate Limiting ─────────────────────────────────────────────────────────
// General limit: 200 requests per 15 minutes per IP.
app.use("/api", apiLimiter);
// Stricter limit on auth: 15 requests per 15 minutes per IP (brute-force protection).
app.use("/api/auth", authLimiter);

// ─── 4. Body Parsing ──────────────────────────────────────────────────────────
// 1mb is sufficient for JSON API payloads — no file uploads in this app.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ─── 5. NoSQL Injection Prevention ───────────────────────────────────────────
// express-mongo-sanitize strips $ and . from req.body, req.query, and req.params.
// This prevents attacks like { "email": { "$gt": "" } } bypassing auth queries.
app.use(mongoSanitize);

// ─── 6. HTTP Parameter Pollution Prevention ───────────────────────────────────
// hpp ensures each query parameter appears only once.
// Whitelisted params are allowed to appear multiple times (used for multi-value filters).
app.use(hpp({ whitelist: ["type", "category", "sort"] }));

// ─── 7. Compression ───────────────────────────────────────────────────────────
// gzip reduces response size by 30-70%. Skips small responses (<1KB).
app.use(
  compression({
    level: 6,       // Balance between CPU cost and compression ratio
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Respect the client's X-No-Compression hint (useful for streaming).
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// ─── 8. Request Logger ────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── 9a. System Health Check ─────────────────────────────────────────────────
// At /api/system/health so it doesn't conflict with the user health score feature at /api/health.
// No auth required — monitoring tools need to call this without a token.
app.get("/api/system/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(0)}s`,
    memory: {
      used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
    },
    cache: {
      entries: cache.size,
    },
    database: "unknown",
  };

  try {
    const dbState = mongoose.connection.readyState;
    health.database = dbState === 1 ? "connected" : "disconnected";

    // Lightweight admin ping to verify the connection is actually working.
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    health.databasePingMs = Date.now() - pingStart;
  } catch {
    health.status = "degraded";
    health.database = "error";
  }

  res.status(health.status === "ok" ? 200 : 503).json(health);
});

// Performance stats — development only, never expose in production.
if (process.env.NODE_ENV === "development") {
  app.get("/api/debug/perf", (req, res) => {
    res.json({ success: true, data: perfMonitor.getStats() });
  });
}

// ─── 9b. Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/popups", popupRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/annual-plan", annualPlanRoutes);
app.use("/api/monthly-plan", monthlyPlanRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/categorize", categorizeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/google", googleAuthRoutes);
app.use("/uploads", express.static("uploads"));

// ─── 10. 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: "NOT_FOUND",
  });
});

// ─── 11. Error Handler (must be last) ────────────────────────────────────────
app.use(errorHandler);

export default app;
