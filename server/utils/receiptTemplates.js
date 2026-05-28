export const RECEIPT_TEMPLATES = {
  swiggy: {
    identifiers: ["swiggy", "bundl technologies"],
    totalPattern: /(?:total|amount payable|paid via|grand total)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:ordered on|order date|date)\s*:?\s*([\w\s,-]+)/i,
    merchantPattern: /(?:restaurant|merchant|from)\s*:?\s*([a-zA-Z0-9\s,&'-]+)/i,
    category: "Food",
    subCategory: "Online Food Delivery",
  },
  zomato: {
    identifiers: ["zomato", "zomato media", "zomato share"],
    totalPattern: /(?:grand total|total|amount paid|payable)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:date & time|order date|placed on)\s*:?\s*([\w\s,-:/]+)/i,
    merchantPattern: /(?:restaurant|sold by|merchant)\s*:?\s*([a-zA-Z0-9\s,&'-]+)/i,
    category: "Food",
    subCategory: "Online Food Delivery",
  },
  amazon: {
    identifiers: ["amazon", "amzn seller", "amazon pay"],
    totalPattern: /(?:grand total|total|amount due|order total)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:invoice date|order date|date)\s*:?\s*([\w\s,-:/]+)/i,
    merchantPattern: /(?:sold by|seller|merchant)\s*:?\s*([a-zA-Z0-9\s,&'-]+)/i,
    category: "Shopping",
    subCategory: "Electronics / Gadgets",
  },
  flipkart: {
    identifiers: ["flipkart", "fk product"],
    totalPattern: /(?:total amount|grand total|total)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:invoice date|ordered date|date)\s*:?\s*([\w\s,-:/]+)/i,
    merchantPattern: /(?:seller|sold by)\s*:?\s*([a-zA-Z0-9\s,&'-]+)/i,
    category: "Shopping",
    subCategory: "Clothing / Fashion",
  },
  bigbasket: {
    identifiers: ["bigbasket", "big basket", "supermarket grocery"],
    totalPattern: /(?:total|amount paid|invoice value)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:delivery date|invoice date|date)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Food",
    subCategory: "Groceries",
  },
  uber: {
    identifiers: ["uber trip", "uber ride", "uber in"],
    totalPattern: /(?:total|fare|amount paid)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:trip date|date|trip on)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Transport",
    subCategory: "Cab / Taxi",
  },
  ola: {
    identifiers: ["ola ride", "ani technologies", "ola cabs"],
    totalPattern: /(?:total fare|total|amount paid)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:ride date|date|invoice date)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Transport",
    subCategory: "Cab / Taxi",
  },
  petrol_pump: {
    identifiers: [
      "hp cl",
      "bpcl",
      "iocl",
      "indian oil",
      "bharat petroleum",
      "hindustan petroleum",
      "shell station",
      "fuel station",
      "petrol",
      "diesel",
    ],
    totalPattern: /(?:amount|total|sale value|rupees)\s*:?\s*₹?\s*([\d,]+\.\d{2})/i,
    datePattern: /(?:date|dt)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Transport",
    subCategory: "Fuel / Petrol",
  },
  electricity: {
    identifiers: [
      "bescom",
      "tata power",
      "adani electricity",
      "bses",
      "mseb",
      "electricity board",
      "electric bill",
    ],
    totalPattern: /(?:amount due|payable|net amount|total bill)\s*:?\s*₹?\s*([\d,]+\.?\d*)/i,
    datePattern: /(?:bill date|due date|invoice date)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Bills",
    subCategory: "Electricity Bill",
  },
  mobile_recharge: {
    identifiers: ["airtel", "jio", "vodafone", "vi ", "bsnl", "telecom"],
    totalPattern: /(?:recharge amount|amount|total)\s*:?\s*₹?\s*([\d,]+\.?\d*)/i,
    datePattern: /(?:date|recharge date|transaction date)\s*:?\s*([\w\s,-:/]+)/i,
    category: "Bills",
    subCategory: "Mobile Recharge",
  },
};

/**
 * Matches raw OCR text against known templates to extract parser guidelines.
 * 
 * @param {string} ocrText - Extracted raw OCR text
 * @returns {object|null} - Template name and rules, or null
 */
export const matchTemplate = (ocrText) => {
  const lowerText = ocrText.toLowerCase();

  for (const [key, template] of Object.entries(RECEIPT_TEMPLATES)) {
    const isMatched = template.identifiers.some((id) => lowerText.includes(id.toLowerCase()));
    if (isMatched) {
      return {
        templateName: key,
        ...template,
      };
    }
  }

  return null;
};
