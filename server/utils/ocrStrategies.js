import fs from "fs";
import { preprocessImage } from "../services/imageProcessor.js";
import { recognizeImage } from "../services/ocrPool.js";

/**
 * OCR Preprocessing strategies.
 * Defines the parameters used by sharp in preprocessing.
 */
export const STRATEGIES = [
  {
    name: "Default Strategy",
    options: { useThreshold: true, threshold: 128, negate: false },
  },
  {
    name: "High Contrast (Faded Text)",
    options: { useThreshold: true, threshold: 100, negate: false },
  },
  {
    name: "Low Contrast (Dark Text)",
    options: { useThreshold: true, threshold: 160, negate: false },
  },
  {
    name: "No Threshold (Colorful/Grayscale Menu)",
    options: { useThreshold: false, negate: false },
  },
  {
    name: "Negated (White on Dark Bill)",
    options: { useThreshold: true, threshold: 128, negate: true },
  },
];

const scoreOCRResult = (result) => {
  const text = result.fullText || "";
  const linesCount = result.lines?.length || 0;
  const numbersCount = (text.match(/\d+/g) || []).length;
  const keywords = ["total", "subtotal", "tax", "gst", "cgst", "sgst", "amount", "qty", "item", "price", "date"];
  const lowerText = text.toLowerCase();
  const keywordCount = keywords.filter((kw) => lowerText.includes(kw)).length;

  let score = result.confidence;
  score += Math.min(linesCount * 2, 30);
  score += Math.min(numbersCount * 2, 30);
  score += keywordCount * 8;
  return score;
};

/**
 * Executes OCR recognition using fallback strategies if confidence is low.
 * Automatically cleans up intermediate preprocessed files.
 * 
 * @param {string} originalImagePath - Path to the original receipt image
 * @returns {Promise<object>} - Best OCR result details
 */
export const processWithRetry = async (originalImagePath) => {
  let bestResult = null;
  const tempFilesToClean = [];

  for (const strategy of STRATEGIES) {
    let preprocessedPath = null;
    try {
      // 1. Preprocess using sharp based on strategy options
      preprocessedPath = await preprocessImage(originalImagePath, strategy.options);
      tempFilesToClean.push(preprocessedPath);

      // 2. Perform OCR
      const ocrData = await recognizeImage(preprocessedPath);
      
      const result = {
        strategy: strategy.name,
        fullText: ocrData.text || "",
        confidence: ocrData.confidence || 0,
        lines: (ocrData.lines || []).map((line) => ({
          text: line.text || "",
          confidence: line.confidence || 0,
          bbox: line.bbox,
        })),
        words: (ocrData.words || []).map((word) => ({
          text: word.text || "",
          confidence: word.confidence || 0,
        })),
        preprocessedPath, // keep tracking to reuse/delete later
      };

      console.log(`ℹ️ OCR strategy [${strategy.name}] completed with confidence: ${result.confidence}%`);

      const numbersCount = (result.fullText.match(/\d+/g) || []).length;
      const hasLines = result.lines.length >= 5;
      const hasNumbers = numbersCount >= 3;

      // If confidence is extremely high and we have enough lines/numbers, accept early
      if (result.confidence > 75 && hasLines && hasNumbers) {
        bestResult = result;
        break;
      }

      // Track the best result so far based on weighted quality score
      if (!bestResult) {
        bestResult = result;
      } else {
        const currentScore = scoreOCRResult(result);
        const bestScore = scoreOCRResult(bestResult);
        if (currentScore > bestScore) {
          bestResult = result;
        }
      }
    } catch (err) {
      console.error(`⚠️ Strategy [${strategy.name}] failed:`, err.message);
      if (preprocessedPath && fs.existsSync(preprocessedPath)) {
        try { fs.unlinkSync(preprocessedPath); } catch (e) {}
      }
    }
  }

  // Clean up all preprocessed files EXCEPT the best one (or clean all of them as per cleanup rule)
  // We clean all of them to save disk space, since the original receipt is preserved.
  tempFilesToClean.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        // Ignored
      }
    }
  });

  if (!bestResult) {
    throw new Error("OCR text extraction failed on all strategies");
  }

  return bestResult;
};
