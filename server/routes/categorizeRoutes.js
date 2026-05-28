import express from "express";
import { categorize } from "../controllers/categorizeController.js";
import { auth } from "../middleware/auth.js";
import { categorizeSchema, validate } from "../middleware/validate.js";

const router = express.Router();

router.use(auth);

router.post("/", validate(categorizeSchema), categorize);

export default router;
