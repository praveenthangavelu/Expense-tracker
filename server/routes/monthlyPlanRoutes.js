import express from "express";
import { auth } from "../middleware/auth.js";
import {
  validate,
  createMonthlyPlanSchema,
  updateMonthlyPlanBudgetSchema,
  addMonthlyRuleSchema,
  applyRebalanceSchema,
} from "../middleware/validate.js";
import {
  getPlan,
  createPlan,
  updateBudget,
  addRule,
  rebalance,
  applyRebalance,
  getWeeklyReportController,
  getMonthEndReportController,
} from "../controllers/monthlyPlanController.js";

const router = express.Router();

router.use(auth);

router.get("/", getPlan);
router.post("/", validate(createMonthlyPlanSchema), createPlan);
router.put("/budget", validate(updateMonthlyPlanBudgetSchema), updateBudget);
router.post("/rules", validate(addMonthlyRuleSchema), addRule);
router.get("/rebalance", rebalance);
router.post("/rebalance/apply", validate(applyRebalanceSchema), applyRebalance);
router.get("/weekly-report", getWeeklyReportController);
router.get("/month-end-report", getMonthEndReportController);

export default router;
