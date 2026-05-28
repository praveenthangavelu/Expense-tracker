import { matchTemplate } from "../utils/receiptTemplates.js";
import { findMerchant } from "../utils/merchantDatabase.js";
import { classifyByKeywords } from "../utils/keywordClassifier.js";

const ADDRESS_KEYWORDS = [
  "road",
  "street",
  "nagar",
  "colony",
  "lane",
  "cross",
  "main",
  "layout",
  "phase",
  "sector",
  "block",
  "floor",
  "plot",
  "no.",
  "pin",
  "pincode",
  "zip",
  "state",
  "district",
  "city",
  "karnataka",
  "maharashtra",
  "tamil nadu",
  "telangana",
  "delhi",
  "india",
];

const BUSINESS_SUFFIXES = [
  "restaurant",
  "cafe",
  "hotel",
  "mart",
  "store",
  "shop",
  "bazaar",
  "foods",
  "kitchen",
  "bakery",
  "pharmacy",
  "clinic",
  "hospital",
  "salon",
  "studio",
  "academy",
  "institute",
  "garments",
  "apparels",
  "textiles",
  "traders",
  "enterprises",
  "pvt",
  "ltd",
  "llp",
  "inc",
  "co.",
];

const stripGstSuffix = (line) =>
  line
    .replace(/\bGSTIN\b\s*:?\s*\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d.*$/i, "")
    .replace(/\bGST\b\s*(?:NO|NUMBER|IN)?\b.*$/i, "")
    .trim();

const cleanMerchantName = (line) =>
  stripGstSuffix(line)
    .replace(/\s+\b(?:tax\s+invoice|invoice|bill|receipt|cash\s+memo|estimate|order|txn|transaction|ref|total|grand\s+total|amount)\b.*$/i, "")
    .replace(/\b(?:tax\s+invoice|invoice|bill|receipt|cash\s+memo|estimate)\b/gi, "")
    .replace(/^[^\p{L}\p{N}']+/u, "")
    .replace(/[^\p{L}\p{N}.'&\-\s]+$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);

const toTitleCase = (text) =>
  text.replace(/\w\S*/g, (word) => {
    const lower = word.toLowerCase();
    if (["dmart", "d-mart"].includes(lower)) return "DMart";
    if (["kfc", "pvr", "inox", "irctc", "hp", "hpcl", "bpcl", "iocl"].includes(lower)) {
      return lower.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

const hasBusinessSuffix = (line) => {
  const lower = line.toLowerCase();
  return BUSINESS_SUFFIXES.some((suffix) => lower.includes(suffix));
};

const isAddressLine = (line) => {
  const lower = line.toLowerCase();
  return ADDRESS_KEYWORDS.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s|,)${escaped}(\\s|,|$)`, "i").test(lower);
  });
};

const shouldSkipMerchantLine = (line) => {
  const cleaned = stripGstSuffix(line);
  if (!cleaned || cleaned.length < 3) return true;
  if (findMerchant(cleaned)) return false;
  if (/^[\d\s\-+()]{7,15}$/.test(cleaned)) return true;
  if (/\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d/i.test(line)) return !cleaned;
  if (/\bGSTIN?\b/i.test(line)) return !cleaned;
  if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(cleaned)) return true;
  if (isAddressLine(cleaned)) return true;
  if (/^(tax invoice|invoice|bill|receipt|cash memo|estimate|order|txn|transaction|ref|total|subtotal|grand total|amount|payment|paid|balance|item|qty|quantity|description|particulars)\b/i.test(cleaned)) return true;
  if (/\d+\.\d{2}/.test(cleaned) && !hasBusinessSuffix(cleaned)) return true;
  if (/^[\d\s.,]+$/.test(cleaned)) return true;
  if (cleaned.includes("@")) return true;
  if (/www\.|\.com\b|\.in\b/i.test(cleaned)) return true;
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return true;
  return false;
};

const scoreMerchantCandidate = (candidate, candidateIndex) => {
  const text = candidate.cleaned;
  const dbMatch = findMerchant(text);
  let score = 0;

  if (candidateIndex === 0) score += 50;
  else if (candidateIndex === 1) score += 30;
  else if (candidateIndex === 2) score += 10;

  if (text.length >= 4 && text.length <= 40) score += 20;
  if (/^[^a-z]*[A-Z][A-Z\s&'.-]+$/.test(text) && /[A-Z]/.test(text)) score += 15;
  if (/^([A-Z][a-z'&.-]*\s*)+$/.test(text)) score += 10;
  if (hasBusinessSuffix(text)) score += 25;
  if (dbMatch) score += 100;
  if (/\p{L}/u.test(text) && /\d/.test(text)) score -= 10;
  if ((text.match(/,/g) || []).length > 2) score -= 15;

  return { ...candidate, score, dbMatch };
};

const finalMerchantName = (rawName, dbMatch) => {
  const cleaned = cleanMerchantName(rawName);
  if (!cleaned) return "Unknown Merchant";

  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "");
  const matched = dbMatch?.matchedKey?.toLowerCase().replace(/[\s-]+/g, "");
  if (dbMatch?.merchantName && matched && normalized.length <= matched.length + 3) {
    return dbMatch.merchantName;
  }

  if (/^[^a-z]*[A-Z][A-Z\s&'.-]+$/.test(cleaned)) {
    return toTitleCase(cleaned);
  }

  return cleaned.slice(0, 50);
};

const extractMerchant = (fullText, lines, templateMatch) => {
  if (templateMatch?.merchantPattern) {
    const match = fullText.match(templateMatch.merchantPattern);
    if (match) {
      const raw = cleanMerchantName(match[1]);
      if (raw) {
        const matchedMerchant = findMerchant(raw);
        return {
          value: finalMerchantName(raw, matchedMerchant),
          confidence: "high",
          rawText: match[0],
          source: matchedMerchant ? "merchant_database" : "receipt_parser",
          automated: true,
          matchedMerchant,
        };
      }
    }
  }

  const topLines = (lines.length > 0 ? lines.map((line) => line.text || "") : fullText.split(/\r?\n/))
    .slice(0, 10)
    .map((text, originalIndex) => ({
      originalIndex,
      rawText: String(text || "").trim(),
      cleaned: cleanMerchantName(String(text || "")),
    }))
    .filter((candidate) => !shouldSkipMerchantLine(candidate.rawText));

  const scored = topLines
    .map((candidate, index) => scoreMerchantCandidate(candidate, index))
    .sort((a, b) => b.score - a.score);

  let winner = scored[0];
  if (winner) {
    const adjacent = scored.find(
      (candidate) =>
        Math.abs(candidate.originalIndex - winner.originalIndex) === 1 &&
        candidate.cleaned.length <= 30,
    );
    if (
      adjacent &&
      winner.cleaned.length <= 30 &&
      (winner.cleaned.length < 15 || adjacent.cleaned.length < 15 || hasBusinessSuffix(winner.cleaned) || hasBusinessSuffix(adjacent.cleaned))
    ) {
      const ordered = [winner, adjacent].sort((a, b) => a.originalIndex - b.originalIndex);
      const combinedText = `${ordered[0].cleaned} ${ordered[1].cleaned}`.trim();
      if (combinedText.length <= 50) {
        const combinedDbMatch = findMerchant(combinedText);
        winner = {
          ...winner,
          cleaned: combinedText,
          rawText: `${ordered[0].rawText} / ${ordered[1].rawText}`,
          score: winner.score + 20,
          dbMatch: combinedDbMatch || winner.dbMatch || adjacent.dbMatch,
        };
      }
    }

    const confidence = winner.score > 80 ? "high" : winner.score >= 40 ? "medium" : "low";
    return {
      value: finalMerchantName(winner.cleaned, winner.dbMatch),
      confidence,
      rawText: winner.rawText,
      source: winner.dbMatch ? "merchant_database" : "receipt_parser",
      automated: true,
      matchedMerchant: winner.dbMatch || null,
    };
  }

  const dbFallback = findMerchant(fullText);
  if (dbFallback) {
    return {
      value: dbFallback.merchantName || finalMerchantName(dbFallback.matchedKey, dbFallback),
      confidence: dbFallback.confidence,
      rawText: dbFallback.matchedKey,
      source: "merchant_database",
      automated: true,
      matchedMerchant: dbFallback,
    };
  }

  return {
    value: "Unknown Merchant",
    confidence: "low",
    rawText: "",
    source: "receipt_parser",
    automated: true,
    matchedMerchant: null,
  };
};

/**
 * Parses raw OCR text and structures it.
 * 
 * @param {object} ocrResult - Contain fullText, confidence and line data
 * @returns {object} - Structured extraction object
 */
export const parseReceipt = (ocrResult) => {
  const cleanNumbersText = (text) =>
    String(text || "")
      .replace(/(\d+)\s*\.\s*(\d{2})\b/g, "$1.$2")
      .replace(/(\d+)\s*,\s*(\d+)/g, "$1,$2")
      .replace(/(\b\d+)\s+(\d{3}\b)/g, "$1$2");

  const fullText = cleanNumbersText(ocrResult.fullText || "");
  const lines = (ocrResult.lines || []).map((line) => ({
    ...line,
    text: cleanNumbersText(line.text || ""),
  }));

  // Match template first
  const templateMatch = matchTemplate(fullText);

  let amount = { value: 0, confidence: "low", rawText: "" };
  let merchant = { value: "", confidence: "low", rawText: "" };
  let date = { value: new Date(), confidence: "low", rawText: "" };
  let category = { suggested: "Other", subCategory: "", confidence: "low" };
  let tax = null;
  let paymentMethod = null;
  let receiptNumber = { value: "", confidence: "low" };
  let lineItems = [];
  let currency = "INR"; // Default

  // 1. EXTRACT TOTAL AMOUNT
  if (templateMatch && templateMatch.totalPattern) {
    const match = fullText.match(templateMatch.totalPattern);
    if (match) {
      amount.value = parseFloat(match[1].replace(/,/g, ""));
      amount.confidence = "high";
      amount.rawText = match[0];
    }
  }

  if (amount.value === 0) {
    // Generic regex search for keyword + amount
    const totalKeywords = [
      /grand\s*total/i,
      /total\s*amount/i,
      /net\s*amount/i,
      /net\s*total/i,
      /amount\s*payable/i,
      /amount\s*due/i,
      /bill\s*amount/i,
      /total/i,
      /tot/i,
    ];

    for (const kw of totalKeywords) {
      // Look for keyword followed by number (with optional ₹, $, Rs symbols)
      const regex = new RegExp(`\\b${kw.source}\\b\\s*:?\\s*[$₹€£¥]?\\s*([\\d,]+\\.\\d{2})`, "i");
      const match = fullText.match(regex);
      if (match) {
        amount.value = parseFloat(match[1].replace(/,/g, ""));
        amount.confidence = "high";
        amount.rawText = match[0];
        break;
      }
    }
  }

  if (amount.value === 0) {
    const linesList = fullText.split("\n");
    for (let i = linesList.length - 1; i >= 0; i--) {
      const lineText = linesList[i].trim();
      if (/(?:total|tot|to|grand|payable|due|net)\b/i.test(lineText)) {
        const match = lineText.match(/[$₹€£¥]?\s*([\d,]+(?:\.\d{2})?)\s*$/);
        if (match) {
          let val = parseFloat(match[1].replace(/,/g, ""));
          if (val > 1000 && !match[1].includes(".")) {
            val = val / 100;
          }
          if (val >= 10000 && String(val).startsWith("1")) {
            const stripped = parseFloat(String(val).substring(1));
            if (stripped > 100) {
              val = stripped;
            }
          }
          if (val > 0 && val < 100000) {
            amount.value = val;
            amount.confidence = "medium";
            amount.rawText = `Fallback line-end: ${lineText}`;
            break;
          }
        }
      }
    }
  }

  // Fallback: If no keyword total found, search all numbers on the receipt and pick the largest one (usually total at bottom)
  if (amount.value === 0) {
    const numberMatches = fullText.match(/[$₹€£¥]?\s*(\d{1,6}\.\d{2})/g);
    if (numberMatches) {
      const numbers = numberMatches
        .map((numStr) => parseFloat(numStr.replace(/[$₹€£¥\s,]/g, "")))
        .filter((num) => num > 0 && num < 1000000); // Filter out unrealistically huge totals

      if (numbers.length > 0) {
        amount.value = Math.max(...numbers);
        amount.confidence = "medium";
        amount.rawText = `Fallback largest: ₹${amount.value}`;
      }
    }
  }

  // 2. DETECT CURRENCY
  if (fullText.includes("$")) currency = "USD";
  else if (fullText.includes("€")) currency = "EUR";
  else if (fullText.includes("£")) currency = "GBP";
  else if (fullText.includes("¥")) currency = "JPY";
  else currency = "INR";

  // 3. EXTRACT MERCHANT NAME
  merchant = extractMerchant(fullText, lines, templateMatch);
  if (merchant.matchedMerchant) {
    category.suggested = merchant.matchedMerchant.category;
    category.subCategory = merchant.matchedMerchant.subCategory || "";
    category.confidence = merchant.matchedMerchant.confidence === "low" ? "medium" : merchant.matchedMerchant.confidence;
  } else {
    const merchantKeywordMatch = classifyByKeywords(merchant.value);
    if (merchantKeywordMatch) {
      category.suggested = merchantKeywordMatch.category;
      category.subCategory = merchantKeywordMatch.subCategory || "";
      category.confidence = merchantKeywordMatch.confidence;
    }
  }

  // 4. EXTRACT DATE
  if (templateMatch && templateMatch.datePattern) {
    const match = fullText.match(templateMatch.datePattern);
    if (match) {
      const parsed = Date.parse(match[1].trim());
      if (!isNaN(parsed)) {
        date.value = new Date(parsed);
        date.confidence = "high";
        date.rawText = match[0];
      }
    }
  }

  if (date.confidence === "low") {
    // Regex for date formats: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD
    const dateRegexes = [
      /(\d{2})[-/.](\d{2})[-/.](\d{4})/, // DD-MM-YYYY
      /(\d{4})[-/.](\d{2})[-/.](\d{2})/, // YYYY-MM-DD
      /(\d{2})[-/.](\d{2})[-/.](\d{2})/, // DD-MM-YY
      /(\d{2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{2,4})/i, // 25 May 2025
    ];

    for (const r of dateRegexes) {
      const match = fullText.match(r);
      if (match) {
        let parsedDate = null;
        if (r.source.includes("Jan")) {
          // Month name matching
          const day = parseInt(match[1]);
          const monthStr = match[2].toLowerCase();
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          const monthsDict = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
          parsedDate = new Date(year, monthsDict[monthStr], day);
        } else if (match[1].length === 4) {
          // YYYY-MM-DD
          parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else {
          // DD-MM-YYYY or DD-MM-YY
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          parsedDate = new Date(year, month, day);
        }

        if (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate <= new Date()) {
          date.value = parsedDate;
          date.confidence = "high";
          date.rawText = match[0];
          break;
        }
      }
    }
  }

  // 5. EXTRACT TAX
  const taxMatch = fullText.match(/(?:gst|cgst|sgst|igst|vat|service charge|tax)\s*@?\s*(\d{1,2})?%?\s*:?\s*[$₹€£¥]?\s*([\d,]+\.\d{2})/i);
  if (taxMatch) {
    tax = {
      amount: parseFloat(taxMatch[2].replace(/,/g, "")),
      percentage: taxMatch[1] ? parseInt(taxMatch[1]) : 0,
      type: fullText.match(/gst/i) ? "GST" : (fullText.match(/vat/i) ? "VAT" : "Tax"),
      confidence: "high",
    };
  }

  // 6. EXTRACT PAYMENT METHOD
  const pmKeywords = [
    { key: "CASH", pattern: /cash/i },
    { key: "CARD", pattern: /(?:visa|mastercard|amex|card|ending|credit|debit)\s*(?:ending)?\s*(\d{4})?/i },
    { key: "UPI", pattern: /(?:upi|gpay|google pay|phonepe|paytm|bhim)/i },
  ];

  for (const pm of pmKeywords) {
    const match = fullText.match(pm.pattern);
    if (match) {
      paymentMethod = {
        value: pm.key,
        details: pm.key === "CARD" && match[1] ? `ending ${match[1]}` : "",
        confidence: "high",
      };
      break;
    }
  }

  // 7. EXTRACT RECEIPT NUMBER
  const receiptNumRegex = /(?:invoice|bill|receipt|order|txn|ref)\s*(?:no|num|number)?\s*[:#-]?\s*([a-zA-Z0-9-/]+)/i;
  const rcMatch = fullText.match(receiptNumRegex);
  if (rcMatch) {
    receiptNumber.value = rcMatch[1].trim();
    receiptNumber.confidence = "high";
  }

  // 8. EXTRACT LINE ITEMS
  // Match lines having: Name + Qty (optional) + Price
  const itemLineRegex = /^([a-zA-Z\s0-9&'-]+?)\s+(?:(\d+)\s*x\s*([\d.]+)\s+)?(?:rs|inr|[$₹€£¥])?\s*([\d,]+\.\d{2})\s*$/;
  lines.forEach((line) => {
    const lineText = line.text.trim();
    const match = lineText.match(itemLineRegex);
    if (match) {
      const name = match[1].trim();
      const skipKeywords = ["subtotal", "total", "tax", "gst", "cgst", "sgst", "vat", "discount", "cash", "upi", "card", "change", "rounding", "balance", "invoice", "payment", "amount", "charge", "savings", "offer"];
      const shouldSkip = skipKeywords.some((sk) => name.toLowerCase().includes(sk));
      if (!shouldSkip && name.length > 2) {
        const qty = match[2] ? parseInt(match[2]) : 1;
        const totalPrice = parseFloat(match[4].replace(/,/g, ""));
        const unitPrice = match[3] ? parseFloat(match[3]) : totalPrice / qty;

        lineItems.push({
          name,
          quantity: qty,
          unitPrice,
          totalPrice,
          confidence: line.confidence > 60 ? "high" : "medium",
        });
      }
    }
  });

  // 9. CATEGORY AUTO-DETECTION (fallback based on OCR keywords)
  if (category.suggested === "Other") {
    const catMappings = [
      { cat: "Food", sub: "Groceries", words: ["grocery", "supermarket", "mart", "store", "milk", "vegetable", "fruit", "egg", "bread"] },
      { cat: "Food", sub: "Restaurant / Dine-in", words: ["restaurant", "cafe", "dhaba", "food", "dine", "kitchen", "coffee", "tea", "hotel", "canteen"] },
      { cat: "Transport", sub: "Fuel / Petrol", words: ["petrol", "diesel", "fuel", "haldia", "pump", "gasoline"] },
      { cat: "Health", sub: "Medicines", words: ["pharmacy", "chemist", "medical", "clinic", "hospital", "doctor", "tablet", "syrup"] },
      { cat: "Shopping", sub: "Clothing / Fashion", words: ["apparel", "apparels", "accessories", "wear", "garment", "garments", "textiles", "clothing", "boutique", "tailor", "stitching", "fabric", "readymade", "shoes", "fashion", "jeans", "shirt", "retail"] },
      { cat: "Bills", sub: "Electricity Bill", words: ["electricity", "power", "energy", "electric", "bill", "utility"] },
      { cat: "Bills", sub: "Mobile Recharge", words: ["recharge", "mobile", "topup", "telecom", "talktime"] },
      { cat: "Entertainment", sub: "Movies / Theatre", words: ["cinema", "movie", "theater", "show", "ticket", "multiplex"] },
    ];

    const textLower = fullText.toLowerCase();
    for (const item of catMappings) {
      const match = item.words.some((word) => textLower.includes(word));
      if (match) {
        category.suggested = item.cat;
        category.subCategory = item.sub;
        category.confidence = "medium";
        break;
      }
    }
  }

  // Calculate average confidence score
  const confScores = { high: 90, medium: 60, low: 30 };
  const scoreSum =
    confScores[amount.confidence] +
    confScores[merchant.confidence] +
    confScores[date.confidence] +
    confScores[category.confidence];
  const overallConfidence = Math.round(scoreSum / 4);

  return {
    amount,
    merchant,
    date,
    lineItems,
    tax,
    paymentMethod,
    receiptNumber,
    category,
    currency,
    fullText,
    overallConfidence,
  };
};
