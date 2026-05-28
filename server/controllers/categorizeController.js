import asyncHandler from "../middleware/asyncHandler.js";
import { categorizeTransaction } from "../services/categorizationEngine.js";

export const categorize = asyncHandler(async (req, res) => {
  const { note, merchant, amount, date, ocrText } = req.body;

  const categorization = await categorizeTransaction(req.user.id, {
    note,
    merchant,
    amount,
    date,
    ocrText,
  });

  res.status(200).json({
    success: true,
    data: categorization,
  });
});
