import express from "express";
import { create, deleteCategory, getAll } from "../controllers/categoryController.js";
import { auth } from "../middleware/auth.js";
import { createCategorySchema, validate } from "../middleware/validate.js";
import { cacheResponse, invalidateCache } from "../middleware/cacheMiddleware.js";
import { mediumCache } from "../middleware/httpCache.js";

const router = express.Router();

router.use(auth);

// GET /api/categories — cached per user for 30 minutes (categories rarely change).
router.get(
  "/",
  mediumCache,
  cacheResponse((req) => `categories:${req.user.id}`, 1800),
  getAll
);

// POST /api/categories — invalidate this user's category cache on create.
router.post(
  "/",
  validate(createCategorySchema),
  invalidateCache((req) => [`categories:${req.user.id}`]),
  create
);

// DELETE /api/categories/:id — invalidate this user's category cache on delete.
router.delete(
  "/:id",
  invalidateCache((req) => [`categories:${req.user.id}`]),
  deleteCategory
);

export default router;
