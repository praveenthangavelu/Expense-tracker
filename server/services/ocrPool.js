import { createWorker, createScheduler } from "tesseract.js";

const scheduler = createScheduler();
let workers = [];
let isInitialized = false;

/**
 * Initializes the OCR Worker Pool on server startup.
 * Downloads/caches standard language packs and registers workers to scheduler.
 * 
 * @param {number} poolSize - Number of workers to spawn
 */
export const initOCRPool = async (poolSize = 2) => {
  if (isInitialized) return;

  console.log("⏳ Initializing OCR Worker Pool...");
  try {
    for (let i = 0; i < poolSize; i++) {
      // Spawn worker with English and Hindi languages
      const worker = await createWorker("eng+hin");
      
      // Set OCR optimization parameters
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹$€£¥.,:/-()&@# ",
        tessedit_pageseg_mode: "6", // Assume uniform block of text
        preserve_interword_spaces: "1",
      });

      scheduler.addWorker(worker);
      workers.push(worker);
    }
    isInitialized = true;
    console.log(`✅ OCR Worker Pool initialized with ${poolSize} workers`);
  } catch (err) {
    console.error("❌ Failed to initialize OCR Worker Pool:", err);
  }
};

/**
 * Recognizes text from a preprocessed image using the worker pool scheduler.
 * 
 * @param {string} imagePath - Preprocessed image file path
 * @returns {Promise<object>} - Tesseract recognize result data
 */
export const recognizeImage = async (imagePath) => {
  if (!isInitialized) {
    throw new Error("OCR Worker Pool is not initialized");
  }

  // Execute recognize job via scheduler (automatically chooses free worker)
  const result = await scheduler.addJob("recognize", imagePath);
  return result.data;
};

/**
 * Terminates all workers and cleans up the pool on server shutdown.
 */
export const terminatePool = async () => {
  if (!isInitialized) return;

  console.log("⏳ Terminating OCR Worker Pool...");
  try {
    await scheduler.terminate();
    workers = [];
    isInitialized = false;
    console.log("✅ OCR Worker Pool terminated cleanly");
  } catch (err) {
    console.error("❌ Error terminating OCR Worker Pool:", err);
  }
};
