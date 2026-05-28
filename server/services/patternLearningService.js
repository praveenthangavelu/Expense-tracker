import UserPattern from "../models/UserPattern.js";

const STOP_WORDS = new Set([
  "near",
  "at",
  "the",
  "for",
  "and",
  "or",
  "in",
  "on",
  "to",
  "from",
  "my",
  "with",
  "a",
  "an",
  "of",
  "by",
  "shop",
  "store",
  "bill",
]);

export const normalizePatternText = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&'.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const confidenceForFrequency = (frequency) =>
  Math.min(0.95, 0.5 + Math.max(1, frequency) * 0.1);

const extractPatternCandidates = ({ note, merchant, ocrText }) => {
  const sources = [
    { matchField: "note", text: note },
    { matchField: "merchant", text: merchant },
    { matchField: "ocr_text", text: ocrText },
  ];
  const candidates = new Map();

  for (const source of sources) {
    const normalized = normalizePatternText(source.text);
    if (!normalized) continue;

    candidates.set(`${source.matchField}:${normalized}`, {
      inputText: normalized.slice(0, 120),
      matchField: source.matchField,
    });

    const words = normalized
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

    for (const word of words) {
      candidates.set(`${source.matchField}:${word}`, {
        inputText: word,
        matchField: source.matchField,
      });
    }
  }

  return [...candidates.values()];
};

export const learnFromTransaction = async (userId, transaction) => {
  if (!userId || !transaction?.category) return [];
  const learningWeight = Math.max(1, Number(transaction.learningWeight || 1));

  const candidates = extractPatternCandidates({
    note: transaction.note,
    merchant: transaction.merchant,
    ocrText: transaction.ocrText,
  });

  if (candidates.length === 0) return [];

  return Promise.all(
    candidates.slice(0, 20).map(async (candidate) => {
      const pattern = await UserPattern.findOneAndUpdate(
        { user: userId, inputText: candidate.inputText },
        {
          $setOnInsert: {
            user: userId,
            inputText: candidate.inputText,
            correctionCount: 0,
            confidence: 0.5,
            createdAt: new Date(),
          },
          $set: {
            matchField: candidate.matchField,
            category: transaction.category,
            subCategory: transaction.subCategory || null,
            lastUsed: new Date(),
          },
          $inc: { frequency: learningWeight },
        },
        { upsert: true, new: true, setDefaultsOnInsert: false },
      );

      pattern.confidence = confidenceForFrequency(pattern.frequency);
      return pattern.save();
    }),
  );
};

export const registerCorrection = async (
  userId,
  { inputText, suggestedCategory, chosenCategory, chosenSubCategory },
) => {
  const normalized = normalizePatternText(inputText);
  if (!userId || !normalized || !suggestedCategory || suggestedCategory === chosenCategory) return;

  const stalePattern = await UserPattern.findOne({
    user: userId,
    inputText: normalized,
    category: suggestedCategory,
  });

  if (stalePattern) {
    stalePattern.correctionCount += 1;
    stalePattern.confidence = Math.max(0.1, stalePattern.confidence - 0.3);
    if (stalePattern.correctionCount >= 3) {
      await stalePattern.deleteOne();
    } else {
      await stalePattern.save();
    }
  }

  await learnFromTransaction(userId, {
    note: normalized,
    category: chosenCategory,
    subCategory: chosenSubCategory,
    learningWeight: 3,
  });
};

export const matchUserPattern = async (userId, text) => {
  const normalized = normalizePatternText(text);
  if (!userId || !normalized) return null;

  const exact = await UserPattern.findOne({ user: userId, inputText: normalized }).lean();
  if (exact) {
    return {
      category: exact.category,
      subCategory: exact.subCategory || null,
      confidence: exact.confidence >= 0.7 ? "high" : "medium",
      confidenceScore: exact.confidence,
      matchedText: exact.inputText,
    };
  }

  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  if (words.length === 0) return null;

  const wordMatch = await UserPattern.findOne({
    user: userId,
    inputText: { $in: words },
  })
    .sort({ frequency: -1, confidence: -1 })
    .lean();

  if (!wordMatch) return null;

  return {
    category: wordMatch.category,
    subCategory: wordMatch.subCategory || null,
    confidence: wordMatch.confidence >= 0.7 ? "high" : "medium",
    confidenceScore: wordMatch.confidence,
    matchedText: wordMatch.inputText,
  };
};

export const cleanupStalePatterns = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  await UserPattern.deleteMany({
    frequency: { $lt: 3 },
    lastUsed: { $lt: sixMonthsAgo },
  });

  const patterns = await UserPattern.find({});
  await Promise.all(
    patterns.map((pattern) => {
      pattern.confidence = confidenceForFrequency(pattern.frequency);
      return pattern.save();
    }),
  );
};
