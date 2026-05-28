import fs from "fs";
import path from "path";

const emailParsersDir = "d:/Profession/Project/Expense tracker/server/services/emailParsers";

// Ensure directories exist
const dirs = [
  emailParsersDir,
  path.join(emailParsersDir, "banks"),
  path.join(emailParsersDir, "investment"),
  path.join(emailParsersDir, "insurance")
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

// Simple template for standard service parser
const createStandardParserCode = (serviceName, category, subCategory, defaultNote, regexAmt, regexRef) => `
export const parse${serviceName.replace(/[^a-zA-Z0-9]/g, "")} = ({ body, subject, date }) => {
  const result = { source: '${serviceName}', type: 'expense', category: '${category}' };
  ${subCategory ? `result.subCategory = '${subCategory}';` : ''}

  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Basic skip check for marketing
  if (subjectLower.match(/offer|discount|deal|coupon|newsletter|sale|promo/i) && !bodyLower.match(/receipt|invoice|confirm|order|bill|paid|payment/i)) {
    return null;
  }

  // Check if subject is relevant
  const relevantMatch = subjectLower.match(/order|payment|invoice|bill|receipt|confirm|recharge|booking|trip|subscription|membership|charged/i);
  if (!relevantMatch) return null;

  // Extract amount
  const amountMatch = body.match(${regexAmt}) || subject.match(${regexAmt});
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0 || amount > 10000000) return null;

  // Extract reference
  const refMatch = body.match(${regexRef});
  
  result.amount = amount;
  result.merchant = '${serviceName}';
  result.date = date;
  result.referenceId = refMatch ? refMatch[1] : null;
  result.note = '${defaultNote}';
  result.confidence = 85;

  return result;
};
`;

const parsersData = [
  // E-COMMERCE
  { file: "flipkartParser.js", content: createStandardParserCode("Flipkart", "Shopping", null, "Flipkart order", "/(?:grand total|order total|total|amount|payment)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "myntraParser.js", content: createStandardParserCode("Myntra", "Shopping", "Clothing", "Myntra order", "/(?:order total|total paid|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "nykaaParser.js", content: createStandardParserCode("Nykaa", "Shopping", "Personal Care", "Nykaa order", "/(?:grand total|total|paid)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "cromaParser.js", content: createStandardParserCode("Croma", "Shopping", "Electronics", "Croma order", "/(?:invoice total|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:invoice\\s*no\\.?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "tatacliqParser.js", content: createStandardParserCode("Tata Cliq", "Shopping", null, "Tata Cliq purchase", "/(?:order total|total|amount paid)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "ajioParser.js", content: createStandardParserCode("Ajio", "Shopping", "Clothing", "Ajio order", "/(?:grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "meeshoParser.js", content: createStandardParserCode("Meesho", "Shopping", "Clothing", "Meesho purchase", "/(?:total amount|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "snapdealParser.js", content: createStandardParserCode("Snapdeal", "Shopping", null, "Snapdeal purchase", "/(?:total amount|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },

  // FOOD DELIVERY
  { file: "zomatoParser.js", content: createStandardParserCode("Zomato", "Food", "Online Food Delivery", "Zomato delivery", "/(?:total paid|bill total|grand total|total|amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "bigBasketParser.js", content: createStandardParserCode("BigBasket", "Food", "Groceries", "BigBasket groceries", "/(?:amount paid|bill total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "blinkitParser.js", content: createStandardParserCode("Blinkit", "Food", "Groceries", "Blinkit groceries", "/(?:grand total|bill total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "zeptoParser.js", content: createStandardParserCode("Zepto", "Food", "Groceries", "Zepto groceries", "/(?:bill total|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "dunzoParser.js", content: createStandardParserCode("Dunzo", "Food", "Groceries", "Dunzo delivery", "/(?:total paid|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*|order\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },

  // TRANSPORT
  { file: "uberParser.js", content: createStandardParserCode("Uber", "Transport", null, "Uber ride", "/(?:total|fare|amount paid)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:trip\\s*id\\s*[:\\-]?\\s*|receipt\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "olaParser.js", content: createStandardParserCode("Ola", "Transport", null, "Ola ride", "/(?:fare|total|amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:booking\\s*id\\s*[:\\-]?\\s*|crn\\s*#?\\s*)([0-9]+)/i") },
  { file: "makeMyTripParser.js", content: createStandardParserCode("MakeMyTrip", "Transport", "Travel", "MMT booking", "/(?:total paid|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:booking\\s*id\\s*[:\\-]?\\s*|booking\\s*reference\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "goibiboParser.js", content: createStandardParserCode("Goibibo", "Transport", "Travel", "Goibibo booking", "/(?:total amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:booking\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "cleartripParser.js", content: createStandardParserCode("Cleartrip", "Transport", "Travel", "Cleartrip booking", "/(?:total paid|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:trip\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "irctcParser.js", content: createStandardParserCode("IRCTC", "Transport", "Train", "IRCTC train ticket", "/(?:total fare|ticket fare|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:pnr\\s*no\\.?\\s*|pnr\\s*#?\\s*|transaction\\s*id\\s*[:\\-]?\\s*)([0-9]+)/i") },
  { file: "redBusParser.js", content: createStandardParserCode("RedBus", "Transport", "Bus", "redBus ticket", "/(?:total fare|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:ticket\\s*no\\.?\\s*|booking\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },

  // ENTERTAINMENT
  { file: "netflixParser.js", content: createStandardParserCode("Netflix", "Entertainment", "Subscriptions", "Netflix subscription", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:charged|debited|billed)/i", "/(?:invoice\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "spotifyParser.js", content: createStandardParserCode("Spotify", "Entertainment", "Subscriptions", "Spotify Premium", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:receipt\\s*no\\.?\\s*)([0-9]+)/i") },
  { file: "hotstarParser.js", content: createStandardParserCode("Hotstar", "Entertainment", "Subscriptions", "Hotstar Premium", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:transaction\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "bookMyShowParser.js", content: createStandardParserCode("BookMyShow", "Entertainment", null, "Movie Ticket", "/(?:amount paid|total|paid)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:booking\\s*id\\s*[:\\-]?\\s*|booking\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "pvrParser.js", content: createStandardParserCode("PVR", "Entertainment", null, "PVR Movie", "/(?:amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:booking\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },

  // TELECOM / INTERNET
  { file: "airtelParser.js", content: createStandardParserCode("Airtel", "Bills", "Telecom", "Airtel Recharge", "/(?:bill amount|recharge amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:transaction\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "jioParser.js", content: createStandardParserCode("Jio", "Bills", "Telecom", "Jio Recharge", "/(?:bill amount|recharge amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:transaction\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "vodafoneParser.js", content: createStandardParserCode("Vodafone", "Bills", "Telecom", "Vi Recharge", "/(?:bill amount|recharge amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:transaction\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "actFibernetParser.js", content: createStandardParserCode("ACT Fibernet", "Bills", "Internet", "ACT broadband bill", "/(?:bill amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:account\\s*no\\.?\\s*|invoice\\s*#?\\s*)([0-9]+)/i") },
  { file: "hathway.js", content: createStandardParserCode("Hathway", "Bills", "Internet", "Hathway broadband bill", "/(?:bill amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:account\\s*no\\.?\\s*|invoice\\s*#?\\s*)([0-9]+)/i") },

  // UTILITIES
  { file: "bescomParser.js", content: createStandardParserCode("BESCOM", "Bills", "Electricity", "BESCOM Electricity bill", "/(?:bill amount|amount paid|total|amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:consumer\\s*no\\.?\\s*)([0-9]+)/i") },
  { file: "tatapowerParser.js", content: createStandardParserCode("Tata Power", "Bills", "Electricity", "Tata Power Electricity bill", "/(?:bill amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:consumer\\s*no\\.?\\s*)([0-9]+)/i") },
  { file: "adaniParser.js", content: createStandardParserCode("Adani Electricity", "Bills", "Electricity", "Adani Electricity bill", "/(?:bill amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:consumer\\s*no\\.?\\s*)([0-9]+)/i") },
  { file: "mahangarGasParser.js", content: createStandardParserCode("Mahanagar Gas", "Bills", "Gas", "Mahanagar Piped Gas bill", "/(?:bill amount|amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:consumer\\s*no\\.?\\s*)([0-9]+)/i") },

  // HEALTH
  { file: "pharmEasyParser.js", content: createStandardParserCode("PharmEasy", "Health", "Medicines", "PharmEasy medicines", "/(?:bill total|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "netmedsParser.js", content: createStandardParserCode("Netmeds", "Health", "Medicines", "Netmeds medicines", "/(?:bill total|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "oneMgParser.js", content: createStandardParserCode("1mg", "Health", "Medicines", "1mg medicines", "/(?:bill total|grand total|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "cultFitParser.js", content: createStandardParserCode("Cult Fit", "Health", "Fitness", "Cult.fit membership", "/(?:amount paid|total)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:transaction\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") },

  // BANKS
  { file: "banks/hdfcParser.js", content: createStandardParserCode("HDFC Bank", "Other", null, "HDFC transaction", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:txn|ref)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([a-zA-Z0-9]+)/i") },
  { file: "banks/iciciParser.js", content: createStandardParserCode("ICICI Bank", "Other", null, "ICICI transaction", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:txn|ref)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([a-zA-Z0-9]+)/i") },
  { file: "banks/axisParser.js", content: createStandardParserCode("Axis Bank", "Other", null, "Axis transaction", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:txn|ref)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([a-zA-Z0-9]+)/i") },
  { file: "banks/kotakParser.js", content: createStandardParserCode("Kotak Bank", "Other", null, "Kotak transaction", "/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:txn|ref)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([a-zA-Z0-9]+)/i") },

  // INVESTMENTS
  { file: "investment/zerodhaParser.js", content: createStandardParserCode("Zerodha", "Other", "Investments", "Stock trade Zerodha", "/(?:amount|total|value)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:contract\\s*note\\s*#?\\s*|ref\\s*#?\\s*)([a-zA-Z0-9\\-]+)/i") },
  { file: "investment/growwParser.js", content: createStandardParserCode("Groww", "Other", "Investments", "Investment via Groww", "/(?:amount|total|invested)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i", "/(?:order\\s*id\\s*[:\\-]?\\s*)([a-zA-Z0-9\\-]+)/i") }
];

// Add the other specific parsers provided in the prompt
// 1. Amazon Parser
const amazonCode = `
export const parseAmazon = ({ body, subject, date }) => {
  const result = { source: 'Amazon', type: 'expense', category: 'Shopping' };

  if (subject.match(/your.*order|order.*placed|order.*confirmed/i)) {
    const amountMatch = body.match(/(?:grand total|order total|total|amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i)
      || body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:total|charged|debited)/i);

    const orderIdMatch = body.match(/(?:order\\s*#?\\s*|order\\s*id\\s*[:\\-]?\\s*)([\\d\\-]+)/i);

    const itemMatches = [...body.matchAll(/(?:^|\\n)\\s*(\\d+)\\s*x\\s+(.+?)(?:\\s+₹|$)/gm)];
    const items = itemMatches.map(m => ({ qty: parseInt(m[1]), name: m[2].trim() }));

    if (items.length > 0) {
      const itemText = items.map(i => i.name).join(' ').toLowerCase();
      if (itemText.match(/grocery|food|rice|oil|atta|dal|milk|fruit|vegetable/)) {
        result.category = 'Food';
        result.subCategory = 'Groceries';
      } else if (itemText.match(/medicine|tablet|vitamin|supplement|health/)) {
        result.category = 'Health';
      } else if (itemText.match(/book|notebook|pen|stationery|course/)) {
        result.category = 'Education';
      } else if (itemText.match(/phone|laptop|charger|cable|electronics|headphone|earphone/)) {
        result.category = 'Shopping';
        result.subCategory = 'Electronics';
      } else if (itemText.match(/shirt|pant|dress|shoe|clothing|fashion/)) {
        result.category = 'Shopping';
        result.subCategory = 'Clothing';
      }
    }

    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.referenceId = orderIdMatch ? orderIdMatch[1] : null;
    result.items = items;
    result.date = date;
    result.merchant = 'Amazon';
    result.confidence = result.amount ? 90 : 40;
  }
  else if (subject.match(/delivered|shipped|out for delivery/i)) {
    return null;
  }
  else if (subject.match(/refund/i)) {
    const amountMatch = body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:refund|credited|returned)/i);
    result.type = 'income';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.merchant = 'Amazon Refund';
    result.category = 'Other';
    result.note = 'Refund';
    result.confidence = result.amount ? 85 : 30;
  }
  else {
    return null;
  }

  return result;
};
`;

// 2. Swiggy Parser
const swiggyCode = `
export const parseSwiggy = ({ body, subject, date }) => {
  if (!subject.match(/order|delivered|receipt|invoice/i)) return null;

  const amountMatch = body.match(/(?:total paid|bill total|grand total|total|amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i)
    || body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);

  const restaurantMatch = body.match(/(?:from|restaurant|ordered from)\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$)/i);
  const orderIdMatch = body.match(/(?:order\\s*(?:id|#|no)?)\\s*[:\\-]?\\s*([A-Z0-9\\-]+)/i);

  const bodyLower = body.toLowerCase();
  let subCategory = 'Online Food Delivery';
  let isJunk = false;
  if (bodyLower.match(/pizza|burger|fries|fried|mcdonald|kfc|domino|coke|pepsi/)) {
    isJunk = true;
  }

  return {
    source: 'Swiggy',
    type: 'expense',
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    merchant: restaurantMatch ? \`Swiggy - \${restaurantMatch[1].trim()}\` : 'Swiggy',
    date: date,
    referenceId: orderIdMatch ? orderIdMatch[1] : null,
    category: 'Food',
    subCategory: subCategory,
    isJunk: isJunk,
    confidence: amountMatch ? 90 : 35,
  };
};
`;

// 3. SBI Parser
const sbiCode = `
import { parseCreditCard } from './creditCardParser.js';

export const parseSBI = ({ body, subject, date }) => {
  const result = { source: 'SBI', date };

  if (subject.match(/credit|salary|neft|imps|upi.*credit|amount.*credited/i) || body.match(/credited/i)) {
    const amountMatch = body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:has been|is|was)?\\s*credited/i)
      || body.match(/credited.*?(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);

    const senderMatch = body.match(/(?:from|sender|remitter|by)\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$|\\s{2,})/i);
    const refMatch = body.match(/(?:ref|utr|txn|transaction)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([A-Z0-9]+)/i);
    const accountMatch = body.match(/(?:a\\/c|acct?|account)\\s*(?:no\\.?\\s*)?\\s*[xX*\\.]+(\\d{4})/i);

    result.type = 'income';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.referenceId = refMatch ? refMatch[1] : null;
    result.accountNumber = accountMatch ? accountMatch[1] : null;

    if (subject.match(/salary/i) || body.match(/salary|payroll|neft.*(?:company|employer|pvt|ltd|inc)/i)) {
      result.category = 'Salary';
      result.merchant = senderMatch ? senderMatch[1].trim() : 'Salary Credit';
    } else {
      result.category = 'Other';
      result.merchant = senderMatch ? senderMatch[1].trim() : 'Bank Credit';
      result.note = 'Money received';
    }

    result.confidence = result.amount ? 85 : 30;
  }
  else if (subject.match(/debit|transaction|payment|debited|spent/i) || body.match(/debited/i)) {
    const amountMatch = body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:has been|is|was)?\\s*debited/i)
      || body.match(/debited.*?(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);

    const merchantMatch = body.match(/(?:to|towards|at|merchant|payee)\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$|\\s{2,})/i);
    const refMatch = body.match(/(?:ref|utr|txn|transaction)\\s*(?:no|id|#)?\\s*[:\\-]?\\s*([A-Z0-9]+)/i);

    result.type = 'expense';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.merchant = merchantMatch ? merchantMatch[1].trim() : 'Bank Debit';
    result.referenceId = refMatch ? refMatch[1] : null;
    result.category = 'Other';
    result.confidence = result.amount ? 80 : 30;
  }
  else if (subject.match(/credit card|card statement|statement.*card/i)) {
    return parseCreditCard({ body, subject, date });
  }
  else {
    return null;
  }

  return result;
};
`;

// 4. Credit Card Parser
const creditCardCode = `
export const parseCreditCard = ({ body, subject, date }) => {
  const totalDueMatch = body.match(/(?:total amount due|total due|amount payable|minimum due|total outstanding)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);
  const dueDateMatch = body.match(/(?:due date|payment due|pay by|due on)\\s*[:\\-]?\\s*(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4})/i)
    || body.match(/(?:due date|payment due)\\s*[:\\-]?\\s*(\\d{1,2}\\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*\\s*\\d{2,4})/i);
  const cardMatch = body.match(/(?:card|ending|number)\\s*(?:no\\.?\\s*)?\\s*[xX*\\.]+(\\d{4})/i);

  const transactions = [];
  const txnPattern = /(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4})\\s+(.+?)\\s+(?:₹|rs\\.?|inr)?\\s*([\\d,]+\\.?\\d*)\\s*(?:dr|cr)?/gi;
  let match;
  while ((match = txnPattern.exec(body)) !== null) {
    transactions.push({
      date: match[1],
      merchant: match[2].trim(),
      amount: parseFloat(match[3].replace(/,/g, '')),
      type: match[0].toLowerCase().includes('cr') ? 'income' : 'expense'
    });
  }

  if (transactions.length > 0) {
    return transactions.map(txn => ({
      source: 'Credit Card Statement',
      type: txn.type,
      amount: txn.amount,
      merchant: txn.merchant,
      date: txn.date,
      category: 'Other',
      paymentMethod: \`Card XX\${cardMatch ? cardMatch[1] : '****'}\`,
      confidence: 75,
      note: 'From credit card statement'
    }));
  }

  if (totalDueMatch) {
    return {
      source: 'Credit Card Bill',
      type: 'expense',
      amount: parseFloat(totalDueMatch[1].replace(/,/g, '')),
      merchant: 'Credit Card Payment',
      date: dueDateMatch ? dueDateMatch[1] : date,
      category: 'Bills',
      paymentMethod: \`Card XX\${cardMatch ? cardMatch[1] : '****'}\`,
      confidence: 85,
      note: 'Credit card bill payment due'
    };
  }

  return null;
};
`;

// 5. EMI Parser
const emiCode = `
export const parseEMI = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:emi|instalment|installment)\\s*(?:amount|of)?\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i)
    || body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:emi|instalment|deducted.*loan)/i);

  const loanMatch = body.match(/(?:loan|emi)\\s*(?:id|no|number|account)\\s*[:\\-]?\\s*([A-Z0-9]+)/i);
  const loanTypeMatch = body.match(/(?:home loan|car loan|personal loan|education loan|bike loan|vehicle loan|consumer durable|credit card emi)/i);

  if (!amountMatch) return null;

  return {
    source: 'EMI Payment',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: loanTypeMatch ? \`EMI - \${loanTypeMatch[0].trim()}\` : 'EMI Payment',
    date: date,
    referenceId: loanMatch ? loanMatch[1] : null,
    category: 'Bills',
    subCategory: null,
    confidence: 85,
    note: \`Loan EMI \${loanMatch ? \`#\${loanMatch[1]}\` : ''}\`
  };
};
`;

// 6. Mutual Fund Parser
const mutualFundCode = `
export const parseMutualFund = ({ body, subject, date }) => {
  if (subject.match(/sip|purchase|allotment|investment|mutual fund/i)) {
    const amountMatch = body.match(/(?:amount|invested|sip amount|purchase amount)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);
    const fundMatch = body.match(/(?:scheme|fund|plan)\\s*(?:name)?\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$)/i);
    const folioMatch = body.match(/(?:folio)\\s*(?:no|number|#)?\\s*[:\\-]?\\s*([A-Z0-9\\/]+)/i);

    if (!amountMatch) return null;

    return {
      source: 'Mutual Fund',
      type: 'expense',
      amount: parseFloat(amountMatch[1].replace(/,/g, '')),
      merchant: fundMatch ? fundMatch[1].trim().substring(0, 50) : 'Mutual Fund SIP',
      date: date,
      referenceId: folioMatch ? folioMatch[1] : null,
      category: 'Other',
      subCategory: null,
      confidence: 85,
      note: 'Investment - Mutual Fund SIP',
      tags: ['investment', 'sip']
    };
  }

  if (subject.match(/redeem|redemption|withdrawal/i)) {
    const amountMatch = body.match(/(?:amount|redeemed|credited)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);

    return amountMatch ? {
      source: 'Mutual Fund Redemption',
      type: 'income',
      amount: parseFloat(amountMatch[1].replace(/,/g, '')),
      merchant: 'Mutual Fund Redemption',
      date: date,
      category: 'Other',
      confidence: 80,
      note: 'Investment - Mutual Fund Redemption',
      tags: ['investment', 'redemption']
    } : null;
  }

  return null;
};
`;

// 7. Insurance Parser
const insuranceCode = `
export const parseInsurance = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:premium|amount|payment)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);
  const policyMatch = body.match(/(?:policy)\\s*(?:no|number|#|id)?\\s*[:\\-]?\\s*([A-Z0-9\\/\\-]+)/i);
  const typeMatch = body.match(/(?:health insurance|life insurance|motor insurance|car insurance|bike insurance|travel insurance|home insurance|term plan|term insurance)/i);

  if (!amountMatch) return null;

  const insuranceType = typeMatch ? typeMatch[0].trim() : 'Insurance';

  return {
    source: 'Insurance',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: insuranceType,
    date: date,
    referenceId: policyMatch ? policyMatch[1] : null,
    category: insuranceType.match(/health/i) ? 'Health' : 'Bills',
    confidence: 85,
    note: \`Insurance premium - \${insuranceType}\`,
    tags: ['insurance', 'premium']
  };
};
`;

// 8. Rent Parser
const rentCode = `
export const parseRentPayment = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:rent|amount|payment)\\s*[:\\-]?\\s*(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i)
    || body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)\\s*(?:rent|towards rent|monthly rent)/i);

  const landlordMatch = body.match(/(?:landlord|owner|to|paid to)\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$)/i);
  const propertyMatch = body.match(/(?:property|flat|house|apartment|address)\\s*[:\\-]?\\s*(.+?)(?:\\n|<|$)/i);
  const receiptMatch = body.match(/(?:receipt)\\s*(?:no|number|#|id)?\\s*[:\\-]?\\s*([A-Z0-9\\-]+)/i);

  if (!amountMatch) return null;

  return {
    source: 'Rent Payment',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: landlordMatch ? \`Rent - \${landlordMatch[1].trim()}\` : 'Rent Payment',
    date: date,
    referenceId: receiptMatch ? receiptMatch[1] : null,
    category: 'Rent',
    confidence: 85,
    note: propertyMatch ? \`Rent for \${propertyMatch[1].trim()}\` : 'Monthly rent'
  };
};
`;

// 9. Generic Parser
const genericCode = `
export const parseGenericPayment = ({ body, subject, sender, date }) => {
  const bodyLower = body.toLowerCase();

  if (!bodyLower.match(/₹|rs\\.?|inr|amount|paid|charged|debited|credited|payment|invoice|receipt|bill|transaction/i)) {
    return null;
  }

  if (bodyLower.match(/offer|discount|cashback offer|sale|promo|subscribe|unsubscribe|newsletter|opt.?out/i) && 
      !bodyLower.match(/paid|charged|debited|credited|invoice|receipt/i)) {
    return null;
  }

  const amountMatch = body.match(/(?:₹|rs\\.?|inr)\\s*([\\d,]+\\.?\\d*)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (amount <= 0 || amount > 10000000) return null;

  let type = 'expense';
  if (bodyLower.match(/credited|received|refund|cashback|salary|income/)) {
    type = 'income';
  }

  const senderName = sender.split('@')[0]
    .replace(/[._\\-]/g, ' ')
    .replace(/noreply|no.reply|info|support|notify|alert|transaction/gi, '')
    .trim();

  return {
    source: 'Email',
    type: type,
    amount: amount,
    merchant: senderName || 'Unknown',
    date: date,
    category: 'Other',
    confidence: 40,
    note: \`Detected from email: \${subject.substring(0, 50)}\`
  };
};
`;

// Write these specific parsers
fs.writeFileSync(path.join(emailParsersDir, "amazonParser.js"), amazonCode);
fs.writeFileSync(path.join(emailParsersDir, "swiggyParser.js"), swiggyCode);
fs.writeFileSync(path.join(emailParsersDir, "banks/sbiParser.js"), sbiCode);
fs.writeFileSync(path.join(emailParsersDir, "banks/creditCardParser.js"), creditCardCode);
fs.writeFileSync(path.join(emailParsersDir, "banks/emiParser.js"), emiCode);
fs.writeFileSync(path.join(emailParsersDir, "investment/mutualFundParser.js"), mutualFundCode);
fs.writeFileSync(path.join(emailParsersDir, "insurance/insuranceParser.js"), insuranceCode);
fs.writeFileSync(path.join(emailParsersDir, "rentParser.js"), rentCode);
fs.writeFileSync(path.join(emailParsersDir, "genericParser.js"), genericCode);

// Write other standard parsers from the dataset
parsersData.forEach(p => {
  fs.writeFileSync(path.join(emailParsersDir, p.file), p.content);
});

console.log("SUCCESS: All modular parser files generated!");
