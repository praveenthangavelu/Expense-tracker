// Middleware execution order for a typical request:
// 1. cors checks whether the frontend origin is allowed.
// 2. express.json parses JSON request bodies into req.body.
// 3. The matching route runs, such as /api/auth, /api/transactions, or /api/categories.
// 4. Protected routes run auth middleware to verify the JWT and attach req.user.
// 5. Validation middleware checks req.body when the route changes data.
// 6. The controller talks to MongoDB and sends the response.
// 7. If no route matches, the 404 handler returns "Route not found".
// 8. If any middleware/controller throws an error, errorHandler sends a clean JSON error.

// Import express so we can create the HTTP API application.
import express from "express";

// Import cors so the frontend can call this backend from a different origin.
import cors from "cors";

// Import authentication routes such as register, login, and getMe.
import authRoutes from "./routes/authRoutes.js";

// Import transaction routes for CRUD operations and dashboard summaries.
import transactionRoutes from "./routes/transactionRoutes.js";

// Import category routes for default and custom categories.
import categoryRoutes from "./routes/categoryRoutes.js";

// Import new feature routes
import familyRoutes from "./routes/familyRoutes.js";
import subCategoryRoutes from "./routes/subCategoryRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import recurringRoutes from "./routes/recurringRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";

// Import the global error handler that should run after all routes.
import errorHandler from "./middleware/errorHandler.js";

// Create an Express application instance.
const app = express();

// Authentication means proving who the user is, usually with login credentials or a token.
// Authorization means checking what that authenticated user is allowed to access.
// Example: JWT login authenticates the user; checking that a transaction belongs to that user authorizes access.

// Full auth flow:
// 1. User registers or logs in.
// 2. Server returns a signed JWT.
// 3. Frontend sends that JWT on protected requests using Authorization: Bearer <token>.
// 4. auth middleware verifies the token signature and loads the user.
// 5. Controllers use req.user to return only that user's protected data.

// Allow the frontend URL from .env to make requests to this API.
app.use(
  cors({
    origin: process.env.CLIENT_URL,

    // credentials: true allows cookies or authorization credentials to be included when needed.
    credentials: true,
  }),
);

// Tell Express to parse incoming JSON request bodies into req.body.
// The 10mb limit prevents extremely large JSON payloads from using too much server memory.
app.use(express.json({ limit: "10mb" }));

// Create a simple health check route to confirm the API is running.
app.get("/api/health", (req, res) => {
  // Send a JSON response with the current API status and server time.
  res.json({
    status: "ok",
    timestamp: new Date(),
  });
});

// Mount all authentication routes under /api/auth.
// Examples: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me.
app.use("/api/auth", authRoutes);

// Mount all transaction routes under /api/transactions.
// Examples: GET /api/transactions, POST /api/transactions, GET /api/transactions/summary.
app.use("/api/transactions", transactionRoutes);

// Mount all category routes under /api/categories.
// Examples: GET /api/categories, POST /api/categories, DELETE /api/categories/:id.
app.use("/api/categories", categoryRoutes);

// Mount all new feature routes
app.use("/api/family", familyRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/insights", insightRoutes);

// Handle any request that did not match the routes above.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Register the error handler LAST.
// Express only reaches this middleware when a previous route or middleware passes an error to next(error).
app.use(errorHandler);

// Export the app so server.js can connect to MongoDB first, then start listening.
export default app;
