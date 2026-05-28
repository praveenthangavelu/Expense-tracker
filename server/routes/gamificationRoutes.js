import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getProfile,
  getStreaks,
  getBadges,
  markSeen,
  getLeaderboard,
  getXPBoard,
} from "../controllers/gamificationController.js";

const router = express.Router();

router.use(auth);

router.get("/profile", getProfile);
router.get("/streaks", getStreaks);
router.get("/badges", getBadges);
router.post("/badges/seen", markSeen);
router.get("/leaderboard", getLeaderboard);
router.get("/leaderboard/xp", getXPBoard);

export default router;
