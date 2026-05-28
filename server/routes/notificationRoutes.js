import express from "express";
import { getNotifications, markRead, markAllRead } from "../controllers/notificationController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// All notification routes require JWT authentication
router.use(auth);

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
