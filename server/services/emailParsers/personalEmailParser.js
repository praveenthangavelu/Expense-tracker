import { HINDI_SENT_PATTERNS, HINDI_REQUEST_PATTERNS, HINDI_RECEIVED_PATTERNS } from "../../utils/hindiPatterns.js";

const BILL_LINE_PATTERNS = [
  /^(.+?)\s*[=:\-–—]\s*₹?\s*(\d+\.?\d*)$/gm,
  /^(.+?)\s{2,}₹?\s*(\d+\.?\d*)$/gm,
  /^(.+?)\s*@\s*₹?\s*(\d+\.?\d*)\s*[xX×]\s*(\d+)/gm,
  /^(\d+)\s*[xX×]\s*(.+?)\s*[=:\-]\s*₹?\s*(\d+\.?\d*)$/gm,
  /^(.+?)\s*\((\d+)\s*[xX×]\s*₹?\s*(\d+\.?\d*)\)/gm,
  /^(.+?)\s+(\d{2,5})$/gm,
];

const TOTAL_PATTERNS = [
  /total\s*[=:\-–—]\s*₹?\s*([\d,]+\.?\d*)/i,
  /grand\s*total\s*[=:\-–—]\s*₹?\s*([\d,]+\.?\d*)/i,
  /bill\s*(?:amount)?\s*[=:\-–—]\s*₹?\s*([\d,]+\.?\d*)/i,
  /amount\s*[=:\-–—]\s*₹?\s*([\d,]+\.?\d*)/i,
  /sum\s*[=:\-–—]\s*₹?\s*([\d,]+\.?\d*)/i,
  /total\s*₹?\s*([\d,]+\.?\d*)/i,
];

const FOOD_ITEMS = /chapathi|chapati|roti|naan|rice|biryani|dal|daal|sambar|rasam|idli|idly|dosa|vada|upma|poha|paratha|paneer|chicken|mutton|fish|egg|curry|gravy|fry|soup|salad|juice|tea|coffee|chai|lassi|buttermilk|curd|raita|pickle|papad|sweet|dessert|gulab jamun|payasam|halwa|ice cream|noodles|pasta|pizza|burger|sandwich|roll|momos|manchurian|gobi|aloo|bhindi|palak|chole|rajma|puri|bhaji|thali|meal|combo|special|regular|medium|large|small|extra|butter|cheese|masala|tandoori|grilled|fried|steamed/i;

const GROCERY_ITEMS = /rice|oil|atta|dal|sugar|salt|milk|eggs|bread|butter|cheese|flour|spice|masala|soap|detergent|shampoo|toothpaste|tissue/i;

const MEDICINE_ITEMS = /tablet|capsule|syrup|ointment|injection|medicine|paracetamol|crocin|dolo|azithromycin|amoxicillin|vitamin|supplement/i;

const STATIONERY_ITEMS = /pen|pencil|notebook|eraser|ruler|stapler|folder|paper|marker|highlighter|register|book/i;

const preProcessBillText = (text) => {
  if (!text) return "";
  let cleanText = text;
  let previous = "";

  // 1. Replace with separators (= : - / etc.) iteratively to handle overlapping matches
  const separatorRegex = /(\d+(?:\.\d+)?)[^\S\r\n]+([A-Za-z][A-Za-z0-9 ]{1,30})[^\S\r\n]*([=:\-–—])[^\S\r\n]*₹?[^\S\r\n]*(\d+\.?\d*)/g;
  do {
    previous = cleanText;
    cleanText = cleanText.replace(separatorRegex, (match, val1, name, sep, val2) => {
      return `${val1}\n${name}${sep}${val2}`;
    });
  } while (cleanText !== previous);

  // 2. Replace with double space or simple space + number (for space-separated list on a single line)
  const spaceRegex = /(\d+(?:\.\d+)?)[^\S\r\n]+([A-Za-z][A-Za-z0-9 ]{1,30})[^\S\r\n]+(\d{2,5})/g;
  do {
    previous = cleanText;
    cleanText = cleanText.replace(spaceRegex, (match, val1, name, val2) => {
      return `${val1}\n${name}  ${val2}`;
    });
  } while (cleanText !== previous);

  return cleanText;
};

const detectBillFormat = (text) => {
  const cleanText = preProcessBillText(text);
  const lines = cleanText.split("\n").map(l => l.trim()).filter(Boolean);
  const items = [];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    // Skip total, tax, and split lines during item extraction
    if (lineLower.match(/total|subtotal|grand\s*total|sum|cgst|sgst|igst|gst|tax|vat|service\s*charge|per\s*person|your\s*share|each\s*person|per\s*head|tera\s*share|tumhara\s*share|apka\s*share/)) {
      continue;
    }

    // Strip prefix like "Food bill - " or "Bill - " or "Expenses: " from beginning of the line
    const cleanedLine = line.replace(/^(?:food\s+|dinner\s+|lunch\s+|room\s+)?bill\s*[-–—:]\s*/i, "");

    for (let i = 0; i < BILL_LINE_PATTERNS.length; i++) {
      const pattern = BILL_LINE_PATTERNS[i];
      pattern.lastIndex = 0;
      const match = pattern.exec(cleanedLine);
      if (match) {
        let itemName = "";
        let amount = 0;

        if (i === 0 || i === 1 || i === 5) {
          itemName = match[1]?.trim();
          amount = parseFloat(match[2]?.replace(/,/g, "") || "0");
        } else if (i === 2) {
          itemName = match[1]?.trim();
          const unitPrice = parseFloat(match[2]?.replace(/,/g, "") || "0");
          const qty = parseInt(match[3] || "1", 10);
          amount = unitPrice * qty;
        } else if (i === 3) {
          itemName = match[2]?.trim();
          amount = parseFloat(match[3]?.replace(/,/g, "") || "0");
        } else if (i === 4) {
          itemName = match[1]?.trim();
          const qty = parseInt(match[2] || "1", 10);
          const unitPrice = parseFloat(match[3]?.replace(/,/g, "") || "0");
          amount = unitPrice * qty;
        }

        if (itemName && amount > 0 && amount < 50000 && itemName.length > 1 && itemName.length < 50) {
          items.push({ name: itemName, amount });
        }
        break;
      }
    }
  }

  let total = null;
  for (const pattern of TOTAL_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match) {
      total = parseFloat(match[1].replace(/,/g, ""));
      break;
    }
  }

  const hasSplit = cleanText.match(/(?:per\s*person|your\s*share|each\s*person|per\s*head|tera\s*share|tumhara\s*share|apka\s*share)/i);

  if ((items.length >= 2 || (total && hasSplit)) && total && total >= 10 && total <= 100000) {
    return { isBill: true, items, total, confidence: 75 };
  }
  if (items.length >= 3 && !total) {
    total = items.reduce((sum, item) => sum + item.amount, 0);
    if (total >= 10 && total <= 100000) {
      return { isBill: true, items, total, confidence: 60 };
    }
  }
  return { isBill: false };
};

export const parsePersonalEmail = ({ body, subject, sender, date, userName }) => {
  // === NEW: BILL FORMAT DETECTION (runs first) ===
  const billDetection = detectBillFormat(body);

  if (billDetection.isBill) {
    const itemNames = billDetection.items.map(i => i.name.toLowerCase()).join(" ");
    const senderName = extractSenderName(sender);

    // Detect category from items
    let category = "Other";
    let subCategory = null;

    const hasGroceries = GROCERY_ITEMS.test(itemNames);
    const hasRestaurant = /chapathi|chapati|roti|naan|biryani|sambar|rasam|idli|idly|dosa|vada|upma|poha|paratha|paneer|chicken|mutton|fish|curry|gravy|fry|soup|salad|juice|tea|coffee|chai|lassi|buttermilk|curd|raita|pickle|papad|sweet|dessert|gulab jamun|payasam|halwa|ice cream|noodles|pasta|pizza|burger|sandwich|roll|momos|manchurian|gobi|aloo|bhindi|palak|chole|rajma|puri|bhaji|thali|meal|combo|special|tandoori|grilled|steamed/i.test(itemNames);

    if (FOOD_ITEMS.test(itemNames)) {
      category = "Food";
      if (hasGroceries && !hasRestaurant) {
        subCategory = "Groceries";
      } else {
        if (itemNames.match(/chapathi|chapati|idli|idly|dosa|thali|meal|rice|sambar|rasam/)) {
          subCategory = "Tiffin / Mess";
        } else if (itemNames.match(/pizza|burger|fries|noodles|momos|sandwich/)) {
          subCategory = "Fast Food";
        } else {
          subCategory = "Restaurant / Dine-in";
        }
      }
    } else if (GROCERY_ITEMS.test(itemNames)) {
      category = "Food";
      subCategory = "Groceries";
    } else if (MEDICINE_ITEMS.test(itemNames)) {
      category = "Health";
    } else if (STATIONERY_ITEMS.test(itemNames)) {
      category = "Education";
    }

    // Check for per-person split
    let finalAmount = billDetection.total;
    let splitNote = "";
    const perPersonMatch = body.match(/(?:per\s*person|your\s*share|each\s*person|per\s*head|tera\s*share|tumhara\s*share|apka\s*share)\s*[=:\-–—]?\s*₹?\s*(\d+\.?\d*)/i);
    if (perPersonMatch) {
      finalAmount = parseFloat(perPersonMatch[1]);
      splitNote = ` (Your share of ₹${billDetection.total} total)`;
    }

    // Check for tax
    let taxNote = "";
    const taxMatch = body.match(/(?:cgst|sgst|igst|gst|tax|vat|service\s*charge)\s*(?:@?\s*\d+%?)?\s*[=:\-–—]?\s*₹?\s*(\d+\.?\d*)/i);
    if (taxMatch) {
      taxNote = ` | Tax: ₹${taxMatch[1]}`;
    }

    let note = "";
    if (billDetection.items.length > 0) {
      note = `Bill: ${billDetection.items.map(i => `${i.name} ₹${i.amount}`).join(", ")}${splitNote}${taxNote}`;
    } else {
      note = `Your share of ₹${billDetection.total} total${taxNote}`;
    }

    return {
      source: "Personal Email",
      sourceDetail: `Bill from ${senderName}`,
      type: "expense",
      subType: "shared_bill",
      amount: finalAmount,
      merchant: `${senderName} (Shared bill)`,
      date: date,
      category: category,
      subCategory: subCategory,
      confidence: billDetection.confidence,
      note,
      lineItems: billDetection.items,
      senderEmail: sender,
      senderName: senderName,
      isPersonal: true,
      tags: ["bill", "split"],
      rawText: body.substring(0, 500)
    };
  }

  // === EXISTING CODE CONTINUES BELOW ===
  const bodyLower = body.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const fullText = `${subjectLower} ${bodyLower}`;

  // Extract money amounts
  const amountMatches = [...fullText.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/gi)];
  const amountMatchesInformal = [...fullText.matchAll(/(\d{3,7})\s*(?:rupees|rs|bucks|rupaiya)/gi)];
  const amountMatchesPlain = [...fullText.matchAll(/(?:sent|paid|transfer|pay|owe|share|split|amount)\s*(?:of|is|was)?\s*(?:₹|rs\.?)?\s*(\d{3,7})/gi)];

  const allAmounts = [
    ...amountMatches.map(m => parseFloat(m[1].replace(/,/g, ""))),
    ...amountMatchesInformal.map(m => parseFloat(m[1])),
    ...amountMatchesPlain.map(m => parseFloat(m[1]))
  ].filter(a => a > 0 && a < 10000000);

  if (allAmounts.length === 0) return null;

  // Pick primary amount (first mentioned is most likely)
  const primaryAmount = allAmounts[0];

  // Check transaction-indicating verbs
  const TRANSACTION_SENT_PATTERNS = [
    /(?:i|i've|ive)\s*(?:have\s*)?(?:sent|transferred|paid|given|deposited|forwarded|credited)/i,
    /(?:sent|transferred|paid|given|deposited)\s*(?:you|to you|to your|to ur)/i,
    /(?:sending|transferring|paying)\s*(?:you|to you|now|rn)/i,
    /(?:done|made)\s*(?:the\s*)?(?:payment|transfer|transaction)/i,
    /(?:credited|deposited)\s*(?:to|in)\s*(?:your|ur)/i,
    /(?:paytm|gpay|phonepe|upi|neft|imps|bank transfer)\s*(?:sent|done|kiya|kar diya|kr diya)/i,
    /(?:bhej|bhej diya|bheja|transfer kiya|kar diya|de diya|diya hai|sent kar diya)/i,
  ];

  const TRANSACTION_REQUEST_PATTERNS = [
    /(?:please|pls|plz)?\s*(?:pay|send|transfer|give)\s*(?:me|back)/i,
    /(?:you|u)\s*(?:owe|need to pay|have to pay)/i,
    /(?:your|ur)\s*(?:share|part|split|portion)\s*(?:is|was|comes to)/i,
    /(?:pay|send)\s*(?:when|whenever|jab bhi)\s*(?:you can|possible|free)/i,
    /(?:pending|due|remaining|baaki|baki)\s*(?:amount|payment|₹|rs)/i,
    /(?:collect|le lena|le lo|lena|bhej dena|de dena|dede)/i,
    /(?:split|divided|per person|per head|each person)/i,
  ];

  const TRANSACTION_RECEIVED_PATTERNS = [
    /(?:received|got)\s*(?:your|the)\s*(?:payment|money|amount|transfer)/i,
    /(?:thanks|thank you|thanku|thnx)\s*(?:for\s*)?(?:the\s*)?(?:payment|money|transfer|sending|paying)/i,
    /(?:payment|money|amount)\s*(?:received|got|mil gaya|aa gaya|aaya)/i,
  ];

  const EXPENSE_CONTEXT_PATTERNS = [
    /(?:i|i've)\s*(?:paid|bought|bought|ordered)\s*(?:for you|for your|your)/i,
    /(?:bill|ticket|booking|order|food|dinner|lunch|breakfast|cab|auto|hotel|room)\s*(?:for|of)\s*(?:you|your|us|all)/i,
    /(?:bought|booked|ordered|got)\s*(?:you|your|for you)/i,
    /(?:your|ur)\s*(?:bill|ticket|share|rent|emi|fee|tuition)/i,
  ];

  const hasSentVerb = TRANSACTION_SENT_PATTERNS.some(p => p.test(fullText)) || HINDI_SENT_PATTERNS.some(p => p.test(fullText));
  const hasRequestVerb = TRANSACTION_REQUEST_PATTERNS.some(p => p.test(fullText)) || HINDI_REQUEST_PATTERNS.some(p => p.test(fullText));
  const hasReceivedVerb = TRANSACTION_RECEIVED_PATTERNS.some(p => p.test(fullText)) || HINDI_RECEIVED_PATTERNS.some(p => p.test(fullText));
  const hasExpenseContext = EXPENSE_CONTEXT_PATTERNS.some(p => p.test(fullText));

  if (!hasSentVerb && !hasRequestVerb && !hasReceivedVerb && !hasExpenseContext) {
    return null;
  }

  // Determine type
  let type = null;
  let subType = null;

  if (hasSentVerb) {
    type = "income";
    subType = "received_from_friend";
  } else if (hasReceivedVerb) {
    type = "income";
    subType = "payment_confirmed";
  } else if (hasRequestVerb) {
    type = "expense";
    subType = "payment_request";
  } else if (hasExpenseContext) {
    type = "expense";
    subType = "owed_to_friend";
  }

  // Extract involved names
  const senderName = extractSenderName(sender);
  const personMatch = body.match(/(?:from|to|by|sent by|paid by|paid to)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  const personName = personMatch ? personMatch[1] : senderName;

  // Detect purpose / category
  let category = "Other";
  let subCategory = null;
  let note = "";

  const PURPOSE_MAP = [
    { patterns: [/dinner|lunch|breakfast|food|biryani|pizza|chai|coffee|eat|khana|restaurant/i], category: "Food", subCategory: "Restaurant / Dine-in", note: "Shared meal" },
    { patterns: [/movie|film|ticket|show|concert|event|pvr|inox/i], category: "Entertainment", note: "Shared entertainment" },
    { patterns: [/cab|auto|uber|ola|ride|taxi|transport|travel|trip|bus|train|flight/i], category: "Transport", note: "Shared transport" },
    { patterns: [/rent|room|flat|house|apartment|pg|paying guest|hostel/i], category: "Rent", note: "Rent share" },
    { patterns: [/electricity|electric|bill|water|gas|internet|wifi|broadband|maintenance/i], category: "Bills", note: "Shared bill" },
    { patterns: [/grocery|vegetables|fruits|kirana|supermarket|ration/i], category: "Food", subCategory: "Groceries", note: "Shared groceries" },
    { patterns: [/gift|birthday|anniversary|wedding|present|surprise/i], category: "Shopping", note: "Shared gift" },
    { patterns: [/medicine|medical|doctor|hospital|pharmacy/i], category: "Health", note: "Medical expense" },
    { patterns: [/book|course|class|tuition|fee|school|college/i], category: "Education", note: "Education expense" },
    { patterns: [/recharge|mobile|phone|data pack/i], category: "Bills", note: "Recharge" },
    { patterns: [/shopping|clothes|shoes|electronics|amazon|flipkart/i], category: "Shopping", note: "Shared shopping" },
    { patterns: [/party|celebration|outing|picnic|trip|vacation|holiday|goa|manali/i], category: "Entertainment", note: "Shared outing" },
    { patterns: [/loan|borrow|lend|udhar|udhaar/i], category: "Other", note: "Personal loan" },
  ];

  for (const mapping of PURPOSE_MAP) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(fullText)) {
        category = mapping.category;
        subCategory = mapping.subCategory || null;
        note = mapping.note;
        break;
      }
    }
    if (note) break;
  }

  // Build description/merchant
  let merchant = "";
  if (type === "income") {
    merchant = `${personName} → You`;
    if (note) merchant += ` (${note})`;
  } else if (subType === "payment_request") {
    merchant = `Pay ${personName}`;
    if (note) merchant += ` (${note})`;
  } else if (subType === "owed_to_friend") {
    merchant = `Owe ${personName}`;
    if (note) merchant += ` (${note})`;
  } else {
    merchant = personName;
    if (note) merchant += ` - ${note}`;
  }

  // Confidence scoring
  let confidence = 30;
  if (amountMatches.length > 0) confidence += 20;
  if (hasSentVerb || hasRequestVerb || hasReceivedVerb) confidence += 20;
  if (note) confidence += 10;
  if (fullText.match(/upi|gpay|phonepe|paytm|neft|imps|bank transfer|account/i)) confidence += 15;
  if (fullText.match(/done|confirmed|success|completed|kiya|ho gaya|kar diya/i)) confidence += 10;
  confidence = Math.min(confidence, 85);

  // Filter out false positives
  if (fullText.match(/(?:costs?|price|worth|value|mrp|rate)\s*(?:is|was|around|about|₹|rs)/i) && !hasSentVerb && !hasRequestVerb) {
    return null;
  }
  if (fullText.match(/(?:check out|look at|see this|amazing deal|great offer|discount|sale|coupon|promo)/i) && !hasSentVerb && !hasRequestVerb) {
    return null;
  }
  if (fullText.match(/(?:would cost|might be|could be|if we|should we|what if|planning to|thinking of)/i) && !hasSentVerb) {
    return null;
  }
  if (fullText.match(/(?:article|news|report|study|survey|according to|crore|billion|million|stock market|sensex|nifty)/i) && !hasSentVerb && !hasRequestVerb) {
    return null;
  }
  if (fullText.match(/(?:salary is|package|ctc|offer letter|hike|increment|appraisal)/i) && !hasSentVerb) {
    return null;
  }

  return {
    source: "Personal Email",
    sourceDetail: `Email from ${senderName}`,
    type: type || "expense",
    subType: subType,
    amount: primaryAmount,
    merchant,
    date,
    category,
    subCategory,
    confidence,
    note: note || `From ${senderName}'s email`,
    senderEmail: sender,
    senderName: personName,
    isPersonal: true,
    tags: subType === "payment_request" ? ["pending", "request"] : 
          subType === "owed_to_friend" ? ["pending", "owe"] : [],
    rawText: body.substring(0, 300),
  };
};

const extractSenderName = (email) => {
  const nameMatch = email.match(/^(.+?)\s*</);
  if (nameMatch) return nameMatch[1].trim();

  const localPart = email.split("@")[0];
  return localPart
    .replace(/[._\-\d]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
