// Rate limiting middleware using express-rate-limit.
// Limits are per IP address. Standard headers (RateLimit-*) are sent to clients.
// Responses follow the app's { success, message } envelope so the frontend handles them uniformly.

import rateLimit from "express-rate-limit";

// Applied to ALL /api/* routes as a baseline.
// 200 requests per 15-minute window is generous for normal usage.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes.",
    errorCode: "RATE_LIMITED",
  },
  standardHeaders: true,  // Sends RateLimit-* headers per RFC draft
  legacyHeaders: false,   // Disables X-RateLimit-* (older format)
});

// Stricter limit for auth endpoints — prevents brute-force credential stuffing.
// 15 login/register attempts per 15 minutes per IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    errorCode: "RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
