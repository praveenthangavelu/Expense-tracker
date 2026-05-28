import express from "express";
import {
  create,
  deleteTransaction,
  getAll,
  getSummary,
  update,
} from "../controllers/transactionController.js";
import { auth } from "../middleware/auth.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
  validate,
} from "../middleware/validate.js";
import { cacheResponse, invalidateCache } from "../middleware/cacheMiddleware.js";
import { shortCache } from "../middleware/httpCache.js";

const router = express.Router();

// All transaction routes require a valid JWT.
router.use(auth);

// GET /api/transactions — dynamic filters make per-request caching impractical.
router.get("/", getAll);

// GET /api/transactions/summary — cached per user per month/year for 5 minutes.
// Must be mounted BEFORE /:id routes or "summary" would be treated as req.params.id.
router.get(
  "/summary",
  shortCache,
  cacheResponse(
    (req) => {
      const now = new Date();
      const month = req.query.month || now.getMonth() + 1;
      const year = req.query.year || now.getFullYear();
      return `summary:${req.user.id}:${month}:${year}`;
    },
    300 // 5 minutes
  ),
  getSummary
);

// POST /api/transactions — cache invalidation is handled inside the controller.
router.post("/", validate(createTransactionSchema), create);

// PUT /api/transactions/:id — cache invalidation is handled inside the controller.
router.put("/:id", validate(updateTransactionSchema), update);

// DELETE /api/transactions/:id — cache invalidation is handled inside the controller.
router.delete("/:id", deleteTransaction);

export default router;
