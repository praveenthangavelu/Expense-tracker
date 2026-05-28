import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getHealthScore,
  getJunkFoodTrend
} from "../controllers/healthController.js";

const router = express.Router();

// All health routes require auth
router.use(auth);

router.get("/score", getHealthScore);
router.get("/trend", getJunkFoodTrend);

export default router;
