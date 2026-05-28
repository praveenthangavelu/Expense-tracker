import sharp from "sharp";
import path from "path";

/**
 * Preprocesses receipt images for maximum OCR accuracy.
 * Steps:
 * 1. Auto-rotate based on EXIF orientation data.
 * 2. Convert to grayscale.
 * 3. Normalize (stretch contrast).
 * 4. Sharpen text edges.
 * 5. Binarize (black & white thresholding).
 * 6. Resize if too large (standardize width).
 * 7. Save to preprocessed file.
 * 
 * @param {string} imagePath - Original image path
 * @param {object} options - Custom preprocessing options
 * @returns {Promise<string>} - Path to preprocessed image file
 */
export const preprocessImage = async (imagePath, options = {}) => {
  const ext = path.extname(imagePath);
  const dir = path.dirname(imagePath);
  const base = path.basename(imagePath, ext);
  const preprocessedPath = path.join(dir, `${base}_preprocessed${ext}`);

  const thresholdVal = options.threshold !== undefined ? options.threshold : 128;
  const useThreshold = options.useThreshold !== undefined ? options.useThreshold : true;
  const negate = options.negate || false;

  let pipeline = sharp(imagePath).rotate().grayscale();

  if (negate) {
    pipeline = pipeline.negate();
  }

  // Normalize to stretch contrast
  pipeline = pipeline.normalize();

  // Sharpen edges
  pipeline = pipeline.sharpen({ sigma: 1.5 });

  // Binarization (optional, based on strategy)
  if (useThreshold) {
    pipeline = pipeline.threshold(thresholdVal);
  }

  // Resize (limit max width to 2000px, maintain aspect ratio)
  pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });

  await pipeline.toFile(preprocessedPath);
  return preprocessedPath;
};

/**
 * Generates a standard 200x200 cover thumbnail for display in the client dashboard/list.
 * 
 * @param {string} imagePath - Original image path
 * @returns {Promise<string>} - Path to thumbnail image file
 */
export const generateThumbnail = async (imagePath) => {
  const ext = path.extname(imagePath);
  const dir = path.dirname(imagePath);
  const base = path.basename(imagePath, ext);
  const thumbnailPath = path.join(dir, `${base}_thumb${ext}`);

  await sharp(imagePath)
    .rotate()
    .resize(200, 200, { fit: "cover" })
    .toFile(thumbnailPath);

  return thumbnailPath;
};
