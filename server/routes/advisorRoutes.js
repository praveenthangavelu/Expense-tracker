import express from "express";
import { auth } from "../middleware/auth.js";
import { isFamilyAdmin } from "../middleware/familyAuth.js";
import {
  getFullAnalysis,
  getQuickAdvice,
  getFamilyAnalysis
} from "../controllers/advisorController.js";

const router = express.Router();

// All advisor routes require auth
router.use(auth);

router.get("/full", getFullAnalysis);
router.get("/quick", getQuickAdvice);
router.get("/family", isFamilyAdmin, getFamilyAnalysis);

export default router;
