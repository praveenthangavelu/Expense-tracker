import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getAll,
  getMine,
  join,
  getHistory,
  abandon,
} from "../controllers/challengeController.js";

const router = express.Router();

router.use(auth);

router.get("/", getAll);
router.get("/mine", getMine);
router.get("/history", getHistory);
router.post("/:id/join", join);
router.post("/:id/abandon", abandon);

export default router;
