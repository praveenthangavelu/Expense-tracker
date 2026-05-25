import express from "express";
import { auth } from "../middleware/auth.js";
import { validate, setBudgetSchema } from "../middleware/validate.js";
import {
  setBudget,
  getBudget,
  getBudgetStatus,
} from "../controllers/budgetController.js";

const router = express.Router();

// Protect all routes below
router.use(auth);

router.put("/", validate(setBudgetSchema), setBudget);
router.get("/", getBudget);
router.get("/status", getBudgetStatus);

export default router;
