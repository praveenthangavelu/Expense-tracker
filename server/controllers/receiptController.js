import fs from "fs";
import path from "path";
import asyncHandler from "../middleware/asyncHandler.js";
import Receipt from "../models/Receipt.js";
import Transaction from "../models/Transaction.js";
import { AppError } from "../utils/AppError.js";
import { generateThumbnail } from "../services/imageProcessor.js";
import { extractTextFromImage, extractTextFromPDF } from "../services/ocrService.js";
import { parseReceipt } from "../services/receiptParser.js";
import { getHealthAlternative } from "../utils/foodClassifier.js";
import { runAllAutomations } from "../services/automationEngine.js";
import { cache } from "../utils/cache.js";
import {
  categorizeTransaction,
  learnFromUserChoice,
} from "../services/categorizationEngine.js";

// Helper: invalidate user caches after a transaction write
const invalidateUserCache = (userId) => {
  cache.invalidatePattern(`summary:${userId}`);
  cache.invalidatePattern(`healthScore:${userId}`);
  cache.invalidatePattern(`quickAdvice:${userId}`);
  cache.invalidatePattern(`insights:${userId}`);
  cache.invalidatePattern(`budgetStatus:${userId}`);
};

/**
 * Helper to delete files safely.
 */
const safeDeleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`⚠️ Failed to delete file ${filePath}:`, err.message);
    }
  }
};

/**
 * POST /api/receipts/scan
 * Uploads a receipt file, runs OCR + AI parser, and returns auto-fill transaction suggestion.
 */
export const scanReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No receipt file uploaded", 400);
  }

  const startTime = Date.now();

  // Create a processing receipt document
  const receipt = await Receipt.create({
    user: req.user.id,
    originalImage: req.file.path.replace(/\\/g, "/"), // normalize Windows backslashes
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    status: "processing",
  });

  let thumbnailPath = "";
  let preprocessedPath = "";

  try {
    const isPDF = req.file.mimetype === "application/pdf";

    // 1. Generate thumbnail (only for images, PDF uses generic thumbnail placeholder in UI or we skip)
    if (!isPDF) {
      try {
        thumbnailPath = await generateThumbnail(req.file.path);
        receipt.thumbnail = thumbnailPath.replace(/\\/g, "/");
      } catch (err) {
        console.error("⚠️ Failed to generate thumbnail:", err.message);
      }
    }

    // 2. Extract Text (OCR for images, pdf-parse for digital PDFs)
    let ocrResult = null;
    if (isPDF) {
      ocrResult = await extractTextFromPDF(req.file.path);
    } else {
      ocrResult = await extractTextFromImage(req.file.path);
      preprocessedPath = ocrResult.preprocessedPath;
    }

    // 3. Parse Extracted Text
    const parsedData = parseReceipt(ocrResult);

    const categorization = await categorizeTransaction(req.user.id, {
      note: parsedData.merchant.value,
      merchant: parsedData.merchant.value,
      amount: parsedData.amount.value,
      date: parsedData.date.value,
      ocrText: ocrResult.fullText?.slice(0, 200),
    });

    parsedData.category = {
      suggested: categorization.selected.category,
      subCategory: categorization.selected.subCategory || "",
      confidence: categorization.selected.confidence === "none" ? "low" : categorization.selected.confidence,
      source: categorization.source,
      alternatives: categorization.allResults,
    };
    if (
      categorization.selected.merchantName &&
      (!parsedData.merchant.value || parsedData.merchant.confidence === "low")
    ) {
      parsedData.merchant = {
        value: categorization.selected.merchantName,
        confidence: categorization.selected.confidence === "none" ? "low" : categorization.selected.confidence,
        rawText: categorization.selected.matchedKey || categorization.selected.merchantName,
        source: categorization.source,
        automated: true,
        matchedMerchant: categorization.selected,
      };
    }

    // 4. Duplicate Check (same receiptNumber + user in last 30 days)
    let isDuplicate = false;
    if (parsedData.receiptNumber.value) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const existing = await Receipt.findOne({
        user: req.user.id,
        "extractedData.receiptNumber.value": parsedData.receiptNumber.value,
        createdAt: { $gte: thirtyDaysAgo },
        _id: { $ne: receipt._id },
      });
      if (existing) {
        isDuplicate = true;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Update receipt status and data
    receipt.ocrResult = {
      fullText: ocrResult.fullText,
      confidence: ocrResult.confidence,
      processingTimeMs,
    };
    receipt.extractedData = parsedData;
    receipt.isDuplicate = isDuplicate;
    receipt.status = ocrResult.confidence < 40 ? "failed" : "completed";
    await receipt.save();

    // Map clean suggested transaction shape
    const suggestedTransaction = {
      type: "expense",
      amount: parsedData.amount.value,
      category: parsedData.category.suggested,
      subCategory: parsedData.category.subCategory,
      note: parsedData.merchant.value,
      date: parsedData.date.value,
    };

    res.status(200).json({
      success: true,
      data: {
        receiptId: receipt._id,
        extractedData: parsedData,
        overallConfidence: parsedData.overallConfidence,
        isDuplicate,
        processingTimeMs,
        thumbnail: receipt.thumbnail,
        suggestedTransaction,
        categorization,
      },
    });
  } catch (err) {
    console.error("❌ Receipt scanning failed:", err);
    receipt.status = "failed";
    await receipt.save();
    throw new AppError(err.message || "Failed to process receipt OCR", 500);
  }
});

/**
 * POST /api/receipts/confirm
 * Creates a transaction from scanned receipt data and links it.
 */
export const confirmAndCreateTransaction = asyncHandler(async (req, res) => {
  const { receiptId, transactionData } = req.body;

  if (!receiptId) {
    throw new AppError("Receipt ID is required", 400);
  }

  const receipt = await Receipt.findOne({ _id: receiptId, user: req.user.id });
  if (!receipt) {
    throw new AppError("Receipt not found", 404);
  }

  // Create the Transaction document
  const transaction = await Transaction.create({
    ...transactionData,
    user: req.user.id,
    receipt: receiptId,
  });

  await learnFromUserChoice(req.user.id, {
    note: transaction.note,
    merchant: receipt.extractedData?.merchant?.value,
    ocrText: receipt.ocrResult?.fullText?.slice(0, 200),
    chosenCategory: transaction.category,
    chosenSubCategory: transaction.subCategory,
    suggestedCategory: receipt.extractedData?.category?.suggested,
  });

  // Link transaction to receipt
  receipt.transaction = transaction._id;
  receipt.status = "reviewed";
  
  // Calculate differences/edits for analytics
  receipt.userEdits = {
    amountDiff: (transaction.amount || 0) - (receipt.extractedData?.amount?.value || 0),
    merchantChanged: transaction.note !== receipt.extractedData?.merchant?.value,
    categoryChanged: transaction.category !== receipt.extractedData?.category?.suggested,
  };
  await receipt.save();

  // Trigger food health score tip
  let healthTip = null;
  if (transaction.category === "Food" && transaction.type === "expense") {
    const alt = getHealthAlternative(
      transaction.subCategory,
      transaction.note,
      transaction.amount
    );
    if (alt && alt.isJunk) {
      healthTip = alt;
    }
  }

  // Clear cache and run automations
  invalidateUserCache(req.user.id);
  const automationResults = await runAllAutomations(req.user.id);

  res.status(201).json({
    success: true,
    data: {
      transaction,
      receipt,
      healthTip,
      automations: automationResults,
    },
  });
});

/**
 * GET /api/receipts
 * Fetch list of user's scanned receipts (paginated)
 */
export const getReceipts = asyncHandler(async (req, res) => {
  const { page = "1", limit = "12", filter = "all" } = req.query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { user: req.user.id };
  if (filter === "linked") {
    query.transaction = { $ne: null };
  } else if (filter === "unlinked") {
    query.transaction = null;
  }

  const total = await Receipt.countDocuments(query);
  const receipts = await Receipt.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .select("originalImage thumbnail fileType fileSize status isDuplicate transaction createdAt extractedData.amount extractedData.merchant extractedData.date")
    .lean();

  const pages = Math.ceil(total / parsedLimit);

  res.status(200).json({
    success: true,
    data: receipts,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages,
    },
  });
});

/**
 * GET /api/receipts/:id
 * Retrieve full receipt detail
 */
export const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.user.id });
  if (!receipt) {
    throw new AppError("Receipt not found", 404);
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

/**
 * DELETE /api/receipts/:id
 * Deletes receipt document and cleans up image/thumbnail files on disk
 */
export const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.user.id });
  if (!receipt) {
    throw new AppError("Receipt not found", 404);
  }

  // Delete associated files on disk
  safeDeleteFile(receipt.originalImage);
  safeDeleteFile(receipt.thumbnail);
  safeDeleteFile(receipt.preprocessedImage);

  // If a transaction was linked to it, we don't delete the transaction itself
  // but we can decouple it or keep it
  await Receipt.deleteOne({ _id: receipt._id });

  res.status(200).json({
    success: true,
    message: "Receipt deleted successfully",
  });
});

/**
 * POST /api/receipts/:id/retry
 * Retries OCR processing on a failed or poor scan with a different threshold strategy
 */
export const retryOCR = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.user.id });
  if (!receipt) {
    throw new AppError("Receipt not found", 404);
  }

  // Set status processing
  receipt.status = "processing";
  await receipt.save();

  try {
    const isPDF = receipt.fileType === "application/pdf";
    let ocrResult = null;

    if (isPDF) {
      ocrResult = await extractTextFromPDF(receipt.originalImage);
    } else {
      // Force alternate retry strategy (e.g. strategy #2 high contrast)
      ocrResult = await extractTextFromImage(receipt.originalImage);
    }

    const parsedData = parseReceipt(ocrResult);
    const categorization = await categorizeTransaction(req.user.id, {
      note: parsedData.merchant.value,
      merchant: parsedData.merchant.value,
      amount: parsedData.amount.value,
      date: parsedData.date.value,
      ocrText: ocrResult.fullText?.slice(0, 200),
    });
    parsedData.category = {
      suggested: categorization.selected.category,
      subCategory: categorization.selected.subCategory || "",
      confidence: categorization.selected.confidence === "none" ? "low" : categorization.selected.confidence,
      source: categorization.source,
      alternatives: categorization.allResults,
    };
    if (
      categorization.selected.merchantName &&
      (!parsedData.merchant.value || parsedData.merchant.confidence === "low")
    ) {
      parsedData.merchant = {
        value: categorization.selected.merchantName,
        confidence: categorization.selected.confidence === "none" ? "low" : categorization.selected.confidence,
        rawText: categorization.selected.matchedKey || categorization.selected.merchantName,
        source: categorization.source,
        automated: true,
        matchedMerchant: categorization.selected,
      };
    }

    receipt.ocrResult = {
      fullText: ocrResult.fullText,
      confidence: ocrResult.confidence,
      processingTimeMs: receipt.ocrResult?.processingTimeMs || 0,
    };
    receipt.extractedData = parsedData;
    receipt.status = ocrResult.confidence < 40 ? "failed" : "completed";
    await receipt.save();

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (err) {
    receipt.status = "failed";
    await receipt.save();
    throw new AppError(err.message || "Failed to retry OCR", 500);
  }
});
