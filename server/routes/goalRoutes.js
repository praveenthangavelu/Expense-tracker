import express from "express";
import { auth } from "../middleware/auth.js";
import {
  validate,
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
  addSavingsSchema,
  withdrawSavingsSchema,
} from "../middleware/validate.js";
import {
  getAll,
  create,
  addSavings,
  withdrawSavings,
  update,
  pauseResume,
  deleteGoal,
  getRecommendations,
  getInsights,
} from "../controllers/goalController.js";

const router = express.Router();

router.use(auth);

router.get("/", getAll);
router.post("/", validate(createSavingsGoalSchema), create);
router.get("/recommendations", getRecommendations);
router.get("/insights", getInsights);
router.put("/:id", validate(updateSavingsGoalSchema), update);
router.post("/:id/add", validate(addSavingsSchema), addSavings);
router.post("/:id/withdraw", validate(withdrawSavingsSchema), withdrawSavings);
router.patch("/:id/pause-resume", pauseResume);
router.delete("/:id", deleteGoal);

export default router;
