// Import Express so we can create a transaction router.
import express from "express";

// Import transaction controller functions.
import {
  create,
  deleteTransaction,
  getAll,
  getSummary,
  update,
} from "../controllers/transactionController.js";

// Import auth middleware so every transaction route belongs to a logged-in user.
import { auth } from "../middleware/auth.js";

// Import validation middleware and transaction schemas.
import {
  createTransactionSchema,
  updateTransactionSchema,
  validate,
} from "../middleware/validate.js";

// Create a router for all /api/transactions routes.
const router = express.Router();

// Apply auth to ALL routes below this line.
// This means every transaction route requires Authorization: Bearer <token>.
router.use(auth);

// GET /api/transactions
router.get("/", getAll);

// CRITICAL: /summary must be mounted before any /:id style route.
// Express matches routes in order, so if /:id came first, "summary" could be treated as req.params.id.
router.get("/summary", getSummary);

// POST /api/transactions
router.post("/", validate(createTransactionSchema), create);

// PUT /api/transactions/:id
router.put("/:id", validate(updateTransactionSchema), update);

// DELETE /api/transactions/:id
router.delete("/:id", deleteTransaction);

// Export the router so app.js can mount it at /api/transactions.
export default router;
