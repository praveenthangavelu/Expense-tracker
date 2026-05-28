// Load .env variables into process.env as the very first operation.
// Nothing else should run before this because app.js reads process.env at import time.
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables before anything else.
// This exits immediately with a clear message if any required var is missing,
// instead of failing silently later with a confusing runtime error.
import { validateEnv } from "./config/env.js";
validateEnv();

// Import the database connection function.
import { connectDB } from "./config/db.js";

// Import the Express app after dotenv.config() and validateEnv() so app.js can
// safely read process.env values without any risk of missing variables.
const { default: app } = await import("./app.js");

// Import the recurring transactions background job.
import { startRecurringJob } from "./jobs/recurringJob.js";
import { startCronJobs } from "./jobs/scheduledJobs.js";

// Import cache for cleanup on shutdown.
import { cache } from "./utils/cache.js";
import fs from "fs";
import { initOCRPool, terminatePool } from "./services/ocrPool.js";

// Import mongoose for graceful connection close on shutdown.
import mongoose from "mongoose";

const PORT = process.env.PORT || 5000;

// ─── Startup ──────────────────────────────────────────────────────────────────
// Connect to MongoDB first, then start accepting HTTP requests.
// This prevents the app from serving requests before the database is ready.
const server = await connectDB().then(() => {
  // Ensure the uploads directory exists
  if (!fs.existsSync("uploads/receipts")) {
    fs.mkdirSync("uploads/receipts", { recursive: true });
  }

  const httpServer = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    await initOCRPool(2);
  });

  // Start the recurring transactions background job.
  startRecurringJob();
  startCronJobs();

  return httpServer;
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Graceful shutdown means: stop accepting new requests, finish in-flight requests,
// then cleanly close database connections and release resources before exiting.

const shutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received — shutting down gracefully...`);

  // Stop the HTTP server from accepting new connections.
  // Existing in-flight requests are allowed to complete.
  server.close(async () => {
    console.log("✅ HTTP server closed");

    try {
      // Close the MongoDB connection pool cleanly.
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");

      // Terminate the OCR pool workers
      await terminatePool();

      // Release all cached data.
      cache.clear();
      console.log("✅ Cache cleared");

      process.exit(0);
    } catch (err) {
      console.error("❌ Error during shutdown:", err.message);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if the server doesn't close in time.
  setTimeout(() => {
    console.error("❌ Forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
};

// Container orchestrators (Docker, Kubernetes) send SIGTERM before stopping a container.
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Ctrl+C in the terminal sends SIGINT.
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Unhandled Errors ─────────────────────────────────────────────────────────
// An unhandled rejection means an async operation threw but nothing caught it.
// We log it and shut down because the app may be in an inconsistent state.
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
  shutdown("UNHANDLED_REJECTION");
});

// Uncaught Exception handler
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  shutdown("UNCAUGHT_EXCEPTION");
});

// Triggering nodemon reload for environment variables updating.
