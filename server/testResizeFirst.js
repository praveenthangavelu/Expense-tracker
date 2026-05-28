import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import { STRATEGIES } from "./utils/ocrStrategies.js";
import { initOCRPool, recognizeImage, terminatePool } from "./services/ocrPool.js";

dotenv.config();

const ReceiptSchema = new mongoose.Schema({}, { strict: false });
const Receipt = mongoose.model("Receipt", ReceiptSchema);

const preprocessImageNew = async (imagePath, options = {}) => {
  const ext = fs.existsSync(imagePath) ? ".webp" : ""; // fallback
  const preprocessedPath = "./temp_test_preprocessed.webp";

  const thresholdVal = options.threshold !== undefined ? options.threshold : 128;
  const useThreshold = options.useThreshold !== undefined ? options.useThreshold : true;
  const negate = options.negate || false;

  // 1. Grayscale and Rotate
  let pipeline = sharp(imagePath).rotate().grayscale();

  // 2. Resize first!
  pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });

  if (negate) {
    pipeline = pipeline.negate();
  }

  // 3. Normalize
  pipeline = pipeline.normalize();

  // 4. Sharpen
  pipeline = pipeline.sharpen({ sigma: 1.5 });

  // 5. Threshold
  if (useThreshold) {
    pipeline = pipeline.threshold(thresholdVal);
  }

  await pipeline.toFile(preprocessedPath);
  return preprocessedPath;
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const r = await Receipt.findOne({}).sort({ createdAt: -1 });
  await mongoose.disconnect();

  const imagePath = r.originalImage;
  console.log("Testing NEW preprocess order on:", imagePath);

  await initOCRPool(1);

  for (const strategy of STRATEGIES) {
    console.log(`\n=== Strategy: ${strategy.name} ===`);
    try {
      const preprocessedPath = await preprocessImageNew(imagePath, strategy.options);
      const ocrData = await recognizeImage(preprocessedPath);
      console.log("Confidence:", ocrData.confidence);
      console.log("Extracted Text:\n", ocrData.text);
      if (fs.existsSync(preprocessedPath)) {
        fs.unlinkSync(preprocessedPath);
      }
    } catch (err) {
      console.error("Strategy failed:", err.message);
    }
  }

  await terminatePool();
}

main().catch(console.error);
