import express from "express";
import { auth } from "../middleware/auth.js";
import { isFamilyAdmin } from "../middleware/familyAuth.js";
import {
  getInsights,
  getFamilyInsights,
} from "../controllers/insightController.js";

const router = express.Router();

// Protect all routes below
router.use(auth);

router.get("/", getInsights);
router.get("/family", isFamilyAdmin, getFamilyInsights);

export default router;
