import express from "express";
import { auth } from "../middleware/auth.js";
import {
  validate,
  createRecurringSchema,
  updateRecurringSchema,
} from "../middleware/validate.js";
import {
  getAll,
  create,
  update,
  deleteRecurring,
  toggleActive,
} from "../controllers/recurringController.js";

const router = express.Router();

// Protect all routes below
router.use(auth);

router.get("/", getAll);
router.post("/", validate(createRecurringSchema), create);
router.put("/:id", validate(updateRecurringSchema), update);
router.delete("/:id", deleteRecurring);
router.patch("/:id/toggle", toggleActive);

export default router;
