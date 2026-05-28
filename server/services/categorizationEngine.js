import { classifyByAmountAndTime } from "../utils/amountTimeClassifier.js";
import { classifyByKeywords } from "../utils/keywordClassifier.js";
import { findMerchant } from "../utils/merchantDatabase.js";
import {
  learnFromTransaction,
  matchUserPattern,
  registerCorrection,
} from "./patternLearningService.js";

const confidenceOrder = { high: 3, medium: 2, low: 1, none: 0 };

const normalizeResult = (result) => ({
  category: result.category,
  subCategory: result.subCategory || null,
  confidence: result.confidence || "low",
  icon: result.icon,
  matchedKey: result.matchedKey,
  matchedKeyword: result.matchedKeyword,
  matchedText: result.matchedText,
  reason: result.reason,
  matchType: result.matchType,
  merchantName: result.merchantName,
});

export const categorizeTransaction = async (
  userId,
  { note, merchant, amount, date, ocrText } = {},
) => {
  const results = [];
  const searchText = [note, merchant, ocrText].filter(Boolean).join(" ");

  const merchantMatch = findMerchant(merchant || note || ocrText);
  if (merchantMatch) {
    const result = {
      layer: 1,
      name: "Merchant Database",
      ...normalizeResult(merchantMatch),
    };
    results.push(result);
    if (merchantMatch.confidence === "high") {
      return {
        selected: result,
        allResults: results,
        autoApplied: true,
        source: "merchant_db",
      };
    }
  }

  const patternMatch = await matchUserPattern(userId, searchText);
  if (patternMatch) {
    const result = {
      layer: 2,
      name: "Your Pattern",
      ...normalizeResult(patternMatch),
    };
    results.push(result);
    if (patternMatch.confidence === "high") {
      return {
        selected: result,
        allResults: results,
        autoApplied: true,
        source: "user_pattern",
      };
    }
  }

  const keywordMatch = classifyByKeywords(searchText);
  if (keywordMatch) {
    results.push({
      layer: 3,
      name: "Keyword Match",
      ...normalizeResult(keywordMatch),
    });
  }

  const amountTimeMatch = classifyByAmountAndTime(amount, date);
  if (amountTimeMatch) {
    results.push({
      layer: 4,
      name: "Smart Guess",
      ...normalizeResult(amountTimeMatch),
    });
  }

  if (results.length === 0) {
    return {
      selected: { category: "Other", subCategory: null, confidence: "none" },
      allResults: [],
      autoApplied: false,
      source: "default",
    };
  }

  const best = [...results].sort((a, b) => {
    const confidenceDiff =
      (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
    if (confidenceDiff !== 0) return confidenceDiff;
    return a.layer - b.layer;
  })[0];

  return {
    selected: best,
    allResults: results,
    autoApplied: best.confidence === "high",
    source: `layer_${best.layer}`,
  };
};

export const learnFromUserChoice = async (
  userId,
  { note, merchant, ocrText, chosenCategory, chosenSubCategory, suggestedCategory },
) => {
  await learnFromTransaction(userId, {
    note,
    merchant,
    ocrText,
    category: chosenCategory,
    subCategory: chosenSubCategory,
  });

  if (suggestedCategory && suggestedCategory !== chosenCategory) {
    await registerCorrection(userId, {
      inputText: merchant || note || ocrText,
      suggestedCategory,
      chosenCategory,
      chosenSubCategory,
    });
  }
};
