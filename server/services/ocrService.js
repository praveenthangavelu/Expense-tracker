import fs from "fs";
import { PDFParse } from "pdf-parse";
import { processWithRetry } from "../utils/ocrStrategies.js";

/**
 * Extracts text from a receipt image.
 * Uses the image preprocessing retry pipeline for maximum reliability.
 * 
 * @param {string} imagePath - Original image path
 * @returns {Promise<object>} - Standardized OCR result details
 */
export const extractTextFromImage = async (imagePath) => {
  return await processWithRetry(imagePath);
};

/**
 * Extracts text from a digital PDF bill directly using pdf-parse.
 * 
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<object>} - Standardized text result details
 */
export const extractTextFromPDF = async (pdfPath) => {
  console.log(`ℹ️ Extracting text from PDF: ${pdfPath}`);
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  await parser.destroy();

  const rawText = data.text || "";
  const lines = rawText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const words = rawText.split(/\s+/).map((word) => word.trim()).filter((word) => word.length > 0);

  console.log(`✅ Direct PDF text extraction complete. Character count: ${rawText.length}`);

  return {
    strategy: "Direct PDF Extraction",
    fullText: rawText,
    confidence: 98, // Digital text is highly accurate
    lines: lines.map((l) => ({ text: l, confidence: 98 })),
    words: words.map((w) => ({ text: w, confidence: 98 })),
  };
};
