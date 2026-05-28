import express from "express";
import { auth } from "../middleware/auth.js";
import {
  validate,
  createAnnualPlanSchema,
  updateAnnualPlanMonthSchema,
  updateAnnualCategoryBudgetSchema,
} from "../middleware/validate.js";
import {
  getPlan,
  createPlan,
  updateMonth,
  updateCategoryBudget,
  syncActualsController,
  getAnalysisController,
  getRecommendationsController,
  linkGoal,
} from "../controllers/annualPlanController.js";

const router = express.Router();

router.use(auth);

router.get("/", getPlan);
router.post("/", validate(createAnnualPlanSchema), createPlan);
router.put("/month/:month", validate(updateAnnualPlanMonthSchema), updateMonth);
router.put("/category", validate(updateAnnualCategoryBudgetSchema), updateCategoryBudget);
router.post("/sync", syncActualsController);
router.get("/analysis", getAnalysisController);
router.get("/recommendations", getRecommendationsController);
router.post("/link-goal", linkGoal);

export default router;
