// Custom error class hierarchy for structured, predictable error handling.
// Using named classes instead of raw throw new Error() means:
//   1. Controllers stay clean — one line to throw a typed error.
//   2. errorHandler can distinguish operational errors from programming bugs.
//   3. Frontend receives consistent { success, message, errorCode } shapes.

// Base class for all known/expected operational errors.
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // isOperational = true means we intentionally threw this.
    // errorHandler uses this flag to decide whether to expose the message.
    this.isOperational = true;

    // Capture the V8 stack trace, excluding this constructor frame.
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 — resource ID not found or user doesn't own it.
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

// 401 — no valid token or token belongs to deleted user.
export class UnauthorizedError extends AppError {
  constructor(message = "Not authorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// 403 — authenticated but lacks permission (e.g. not family admin).
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

// 400 — schema validation or malformed input.
export class ValidationError extends AppError {
  constructor(message = "Validation failed", errors = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

// 409 — duplicate key or conflicting state.
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

// 423 — account locked after too many failed login attempts.
export class LockedError extends AppError {
  constructor(message = "Account temporarily locked") {
    super(message, 423, "ACCOUNT_LOCKED");
  }
}
