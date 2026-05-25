// Express knows this is error-handling middleware because it has exactly 4 parameters.
// The order must be (err, req, res, next); if one is missing, Express treats it like normal middleware.
const errorHandler = (err, req, res, next) => {
  // Operational errors are expected runtime problems, like invalid IDs or duplicate emails.
  // Programming errors are bugs in our code, like using an undefined variable or calling a function wrong.
  // This handler gives clients a clean response for operational errors and avoids leaking internals.

  // Use an error's custom statusCode when available, otherwise fall back to 500 for server errors.
  let statusCode = err.statusCode || 500;

  // Use the error's message when available, otherwise use a safe generic message.
  let message = err.message || "Server Error";

  // Mongoose CastError usually happens when an invalid MongoDB ObjectId is used in a route.
  // Example: /api/transactions/not-a-real-id cannot be converted into an ObjectId.
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Resource not found — invalid ID format";
  }

  // MongoDB duplicate key errors use code 11000.
  // This happens when a unique field, like email, already exists in the database.
  if (err.code === 11000) {
    statusCode = 400;

    // err.keyValue contains the duplicated field and value, for example { email: "a@test.com" }.
    const fieldName = Object.keys(err.keyValue)[0];

    message = `Duplicate value for field: ${fieldName}`;
  }

  // Mongoose ValidationError happens when schema rules fail.
  // Example: amount is below 0.01, password is too short, or type is not in the enum list.
  if (err.name === "ValidationError") {
    statusCode = 400;

    // err.errors is an object where each value contains a field-specific validation message.
    message = Object.values(err.errors)
      .map((fieldError) => fieldError.message)
      .join(", ");
  }

  // Send one consistent error response shape to the frontend.
  res.status(statusCode).json({
    success: false,
    message,

    // Stack traces show file paths and code locations, which help during development.
    // We hide them in production because they can reveal private server details to attackers.
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Export this middleware so server.js can register it after all routes.
export default errorHandler;
