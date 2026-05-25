// Import Express so we can create a category router.
import express from "express";

// Import category controller functions.
import {
  create,
  deleteCategory,
  getAll,
} from "../controllers/categoryController.js";

// Import auth middleware so all category routes require a logged-in user.
import { auth } from "../middleware/auth.js";

// Import validation middleware and category schema.
import { createCategorySchema, validate } from "../middleware/validate.js";

// Create a router for all /api/categories routes.
const router = express.Router();

// Apply auth to every category route below this line.
router.use(auth);

// GET /api/categories
router.get("/", getAll);

// POST /api/categories
router.post("/", validate(createCategorySchema), create);

// DELETE /api/categories/:id
router.delete("/:id", deleteCategory);

// Export the router so app.js can mount it at /api/categories.
export default router;
