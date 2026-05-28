import express from "express";
import { auth } from "../middleware/auth.js";
import { validate, confirmTransactionSchema } from "../middleware/validate.js";
import { uploadReceipt } from "../middleware/upload.js";
import {
  scanReceipt,
  confirmAndCreateTransaction,
  getReceipts,
  getReceipt,
  deleteReceipt,
  retryOCR,
} from "../controllers/receiptController.js";

const router = express.Router();

// Apply auth middleware to all receipt routes
router.use(auth);

// OCR receipt upload and scan endpoint
router.post("/scan", uploadReceipt, scanReceipt);

// Confirm transaction from receipt data endpoint
router.post("/confirm", validate(confirmTransactionSchema), confirmAndCreateTransaction);

// Get paginated list of user receipts
router.get("/", getReceipts);

// Get receipt detail
router.get("/:id", getReceipt);

// Delete receipt and disk files
router.delete("/:id", deleteReceipt);

// Re-trigger OCR processing
router.post("/:id/retry", retryOCR);

export default router;
