import express from "express";
import { auth } from "../middleware/auth.js";
import { validate, dismissPopupSchema } from "../middleware/validate.js";
import {
  getRandomPopup,
  getActionPopup,
  dismissPopup,
  getLogs
} from "../controllers/popupController.js";

const router = express.Router();

// All popup routes require auth
router.use(auth);

router.get("/random", getRandomPopup);
router.get("/action", getActionPopup);
router.get("/logs", getLogs);
router.post("/dismiss", validate(dismissPopupSchema), dismissPopup);

export default router;
