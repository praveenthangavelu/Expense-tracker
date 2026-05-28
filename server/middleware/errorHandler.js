// Enhanced error handler with:
//   - Structured JSON logging (timestamp, userId, IP, errorCode)
//   - Typed error recognition (Mongoose, JWT)
//   - errorCode field in every error response for programmatic handling on the frontend
//   - Stack traces only in development (never leak internals in production)

import { AppError } from "../utils/AppError.js";

// Express knows this is error-handling middleware because it has exactly 4 parameters.
const errorHandler = (err, req, res, next) => {
  let error = err;

  // ─── Mongoose: invalid ObjectId ──────────────────────────────────────────
  if (err.name === "CastError") {
    error = new AppError("Invalid ID format", 400, "INVALID_ID");
  }

  // ─── MongoDB: duplicate key ───────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`Duplicate value for: ${field}`, 409, "DUPLICATE");
  }

  // ─── Mongoose: schema validation failure ──────────────────────────────────
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
    error = new AppError(message, 400, "VALIDATION_ERROR");
  }

  // ─── JWT: tampered or wrong secret ───────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401, "INVALID_TOKEN");
  }

  // ─── JWT: token lifetime exceeded ────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired, please log in again", 401, "TOKEN_EXPIRED");
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || "INTERNAL_ERROR";

  // Structured log — one line per error, machine-parseable.
  // Never log stack traces in production; they reveal file paths and library versions.
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "ERROR",
      method: req.method,
      path: req.originalUrl,
      status: statusCode,
      errorCode,
      message: err.message,
      userId: req.user?.id || "anon",
      ip: req.ip,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    })
  );

  // Build the response body.
  const body = {
    success: false,
    // Only expose the message for operational errors we intentionally threw.
    // For unexpected programming errors, return a generic message so we don't leak internals.
    message: error.isOperational ? error.message : "Internal server error",
    errorCode,
  };

  // Include field-level validation errors if available.
  if (error.errors && error.errors.length > 0) {
    body.errors = error.errors;
  }

  // Attach stack trace in development for easier debugging.
  if (process.env.NODE_ENV === "development") {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
