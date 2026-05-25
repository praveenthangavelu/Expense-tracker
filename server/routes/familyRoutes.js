import express from "express";
import { auth } from "../middleware/auth.js";
import { isFamilyAdmin, isFamilyMember } from "../middleware/familyAuth.js";
import {
  validate,
  joinFamilySchema,
  updateFamilySettingsSchema,
  transferAdminSchema,
} from "../middleware/validate.js";
import {
  createFamily,
  joinFamily,
  leaveFamily,
  removeMember,
  transferAdmin,
  getFamily,
  regenerateInviteCode,
  getFamilySummary,
  updateFamilySettings,
} from "../controllers/familyController.js";

const router = express.Router();

// All family routes are protected
router.use(auth);

// Family Actions
router.post("/", createFamily);
router.post("/join", validate(joinFamilySchema), joinFamily);
router.post("/leave", isFamilyMember, leaveFamily);
router.get("/", isFamilyMember, getFamily);

// Administrative family actions
router.delete("/members/:userId", isFamilyAdmin, removeMember);
router.put("/transfer-admin", isFamilyAdmin, validate(transferAdminSchema), transferAdmin);
router.post("/regenerate-code", isFamilyAdmin, regenerateInviteCode);
router.put("/settings", isFamilyAdmin, validate(updateFamilySettingsSchema), updateFamilySettings);

// Summaries
router.get("/summary", isFamilyMember, getFamilySummary);

export default router;
