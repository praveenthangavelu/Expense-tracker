import express from "express";
import { auth } from "../middleware/auth.js";
import { validate, createSubCategorySchema } from "../middleware/validate.js";
import {
  getAll,
  create,
  deleteSubCategory,
} from "../controllers/subCategoryController.js";

const router = express.Router();

// Protect all routes below
router.use(auth);

router.get("/", getAll);
router.post("/", validate(createSubCategorySchema), create);
router.delete("/:id", deleteSubCategory);

export default router;
