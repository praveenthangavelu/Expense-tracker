// Import Express so we can create a modular router for authentication endpoints.
import express from "express";

// Import auth controller functions that contain the route logic.
import { getMe, login, register } from "../controllers/authController.js";

// Import auth middleware for routes that require a valid JWT.
import { auth } from "../middleware/auth.js";

// Import validation helpers and schemas for checking request bodies before controllers run.
import { loginSchema, registerSchema, validate } from "../middleware/validate.js";

// Create a router so auth routes can be mounted under /api/auth in app.js.
const router = express.Router();

// POST /api/auth/register
// validate(registerSchema) rejects invalid request bodies before register() creates a user.
router.post("/register", validate(registerSchema), register);

// POST /api/auth/login
// validate(loginSchema) makes sure email and password are present before login() runs.
router.post("/login", validate(loginSchema), login);

// GET /api/auth/me
// auth verifies the JWT first, then getMe returns the current user from req.user.
router.get("/me", auth, getMe);

// Export the router so app.js can mount all auth routes at once.
export default router;
