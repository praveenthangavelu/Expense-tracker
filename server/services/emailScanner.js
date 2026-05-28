import User from "../models/User.js";
import ImportedTransaction from "../models/ImportedTransaction.js";
import EmailScanLog from "../models/EmailScanLog.js";
import { detectParser } from "./emailParsers/index.js";
import { categorizeTransaction } from "./categorizationEngine.js";

// Helper: Decode Gmail message body
const decodeBase64 = (str) => {
  if (!str) return "";
  // Gmail uses base64url encoding, convert to standard base64 first
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
};

const getEmailBody = (payload) => {
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  let body = "";
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body += decodeBase64(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64(part.body.data);
        const textWithLines = html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<\/div>/gi, "\n")
          .replace(/<\/tr>/gi, "\n")
          .replace(/<\/td>/gi, " ")
          .replace(/<\/li>/gi, "\n");
        body += textWithLines.replace(/<[^>]*>/g, " ");
      } else if (part.parts) {
        body += getEmailBody(part);
      }
    }
  }
  return body;
};

// Refresh Google OAuth tokens
export const refreshGoogleTokens = async (user) => {
  if (!user.googleAuth.refreshToken) {
    throw new Error("No refresh token provided");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "dummy_client_id";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "dummy_client_secret";

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: user.googleAuth.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const error = new Error(errText || "Invalid grant / OAuth refresh failed");
    error.code = response.status;
    throw error;
  }

  const tokens = await response.json();
  user.googleAuth.accessToken = tokens.access_token;
  user.googleAuth.isConnected = true;
  if (tokens.refresh_token) {
    user.googleAuth.refreshToken = tokens.refresh_token;
  }
  await user.save();
  return tokens.access_token;
};

// Call Gmail API with authorization header and automatic retry on 401
const gmailApiCall = async (url, user, method = "GET", body = null) => {
  let token = user.googleAuth.accessToken;

  // Helper function to execute request
  const runReq = async (accessToken) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  };

  let response = await runReq(token);

  if (response.status === 401) {
    console.log("AccessToken expired, attempting to refresh tokens...");
    try {
      token = await refreshGoogleTokens(user);
      response = await runReq(token);
    } catch (err) {
      console.error("Token refresh failed:", err.message);
      throw err;
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(errText || "Gmail API call failed");
    err.code = response.status;
    throw err;
  }

  return response.json();
};

// Fetch message details from Gmail
const fetchMessageDetails = async (messageId, user) => {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const msgData = await gmailApiCall(url, user);
  
  // Extract Headers
  const headers = msgData.payload.headers || [];
  const senderHeader = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
  const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
  const dateHeader = headers.find(h => h.name.toLowerCase() === "date")?.value || "";

  // Parse Date
  let date = new Date();
  if (dateHeader) {
    const parsedDate = Date.parse(dateHeader);
    if (!isNaN(parsedDate)) {
      date = new Date(parsedDate);
    }
  }

  const body = getEmailBody(msgData.payload);

  return {
    id: messageId,
    sender: senderHeader,
    subject: subjectHeader,
    date,
    body,
  };
};

// Main Scanner implementation
export const scanEmails = async (userId, sinceDays = 1) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  let totalEmailsScanned = 0;
  let transactionsDetected = 0;
  let duplicatesSkipped = 0;
  let draftsCreated = 0;
  let incomeCreated = 0;
  let expenseCreated = 0;

  // Development simulation check
  const isSimulation = !process.env.GOOGLE_CLIENT_ID || user.googleAuth.refreshToken === "simulator_refresh_token";

  if (isSimulation) {
    console.log(`🤖 [Scanner Simulation] Simulating email scans for user ${userId}...`);
    
    const DUMMY_EMAILS = [
      {
        id: `sim_${Date.now()}_1`,
        sender: "order-update@amazon.in",
        subject: "Your order #408-1234567-9988776 confirmed",
        body: "Grand Total: ₹849.00. Order #408-1234567-9988776. Items: 1 x Red T-Shirt.",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_2`,
        sender: "alerts@sbi.co.in",
        subject: "Transaction Alert - Credit",
        body: "Your A/c ending 4321 is credited by Rs 45,000.00 on 28-05-26 towards Salary. Ref NEFT123890.",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_3`,
        sender: "zomato@zomato.com",
        subject: "Your Zomato order receipt",
        body: "Total paid: ₹420. Order ID: ZOM-992211. Ordered from Subway.",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_4`,
        sender: "friend@gmail.com",
        subject: "Dinner share last night",
        body: "Please pay me ₹350 for the pizza yesterday dinner split.",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_5`,
        sender: "friend2@gmail.com",
        subject: "Dinner bill",
        body: "Butter Naan   120\nDal Fry       180\nPaneer Tikka  320\nCGST 5%        31\nSGST 5%        31\nTotal         682",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_6`,
        sender: "friend3@gmail.com",
        subject: "flat expenses split",
        body: "Bhai bill aa gaya\nChapathi = 450\nIdly = 40\nTotal = 490\nTera share 245 hai",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_7`,
        sender: "praveentveluwork@gmail.com",
        subject: "Food bill",
        body: "Chapathi = 500 Idly = 100 Total = 600",
        date: new Date(),
      },
      {
        id: `sim_${Date.now()}_8`,
        sender: "praveentveluwork@gmail.com",
        subject: "Food bill",
        body: "Chapathi = 450 Idly = 40 Total = 490",
        date: new Date(),
      }
    ];

    totalEmailsScanned = DUMMY_EMAILS.length;

    for (const email of DUMMY_EMAILS) {
      // Excluded sender check
      if (user.preferences.excludedSenders.includes(email.sender)) {
        continue;
      }

      // Check duplicates
      const exists = await ImportedTransaction.exists({ user: userId, emailId: email.id });
      if (exists) {
        duplicatesSkipped++;
        continue;
      }

      // Detect parser & execute
      const parser = detectParser(email.sender, email.subject);
      if (!parser) continue;

      let parsed = parser({ body: email.body, subject: email.subject, sender: email.sender, date: email.date, userName: user.name });
      if (!parsed) continue;

      transactionsDetected++;

      // Wrap standard returns in array if single object
      const parsedTxns = Array.isArray(parsed) ? parsed : [parsed];

      for (const txn of parsedTxns) {
        // Run categorization if "Other"
        if (txn.category === "Other") {
          const catMatch = await categorizeTransaction(userId, {
            note: txn.note || txn.merchant,
            merchant: txn.merchant,
            amount: txn.amount,
            date: txn.date,
          });
          if (catMatch && catMatch.selected) {
            txn.category = catMatch.selected.category;
            txn.subCategory = catMatch.selected.subCategory;
          }
        }

        // Store draft
        try {
          await ImportedTransaction.create({
            user: userId,
            emailId: email.id,
            source: txn.source,
            sourceDetail: txn.sourceDetail || `Email from ${email.sender}`,
            type: txn.type,
            amount: txn.amount,
            merchant: txn.merchant,
            date: txn.date,
            category: txn.category,
            subCategory: txn.subCategory,
            note: txn.note,
            confidence: txn.confidence,
            referenceId: txn.referenceId,
            status: "draft",
            isPersonal: txn.isPersonal || false,
            isJunk: txn.isJunk || false,
            tags: txn.tags || [],
            rawText: txn.rawText || email.body.substring(0, 300),
          });
          draftsCreated++;
          if (txn.type === "income") incomeCreated++;
          else expenseCreated++;
        } catch (err) {
          if (err.code === 11000) duplicatesSkipped++;
          else console.error("Error creating draft:", err.message);
        }
      }
    }

    user.googleAuth.lastScanAt = now;
    await user.save();

    // Create a Scan Log
    await EmailScanLog.create({
      user: userId,
      emailsScanned: totalEmailsScanned,
      draftsCreated,
      duplicatesSkipped,
    });

    return { totalEmailsScanned, transactionsDetected, duplicatesSkipped, draftsCreated, breakdown: { income: incomeCreated, expense: expenseCreated } };
  }

  // REAL GMAIL SCANNING FLOW
  if (!user.googleAuth.isConnected) {
    throw new Error("Google account not connected");
  }

  try {
    // 1. Search Query
    const searchString = `label:inbox newer_than:${sinceDays}d (from:(amazon OR flipkart OR swiggy OR Zomato OR myntra OR uber OR ola OR netflix OR spotify OR airtel OR jio OR vodafone OR bescom OR tatapower OR bigbasket OR blinkit OR zepto OR makemytrip OR bookmyshow OR pharmeasy OR zerodha OR groww OR nobroker OR hdfc OR sbi OR icici OR axis OR kotak) OR subject:(order OR payment OR receipt OR invoice OR bill OR transaction OR debit OR credit OR salary OR transfer OR subscription OR recharge OR emi OR loan OR insurance OR premium OR sip OR "mutual fund" OR rent OR refund OR statement))`;

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(searchString)}`;
    const listData = await gmailApiCall(listUrl, user);
    
    const messages = listData.messages || [];
    totalEmailsScanned = messages.length;

    for (const msg of messages) {
      // Check if already processed to avoid hitting rate limits on details
      const exists = await ImportedTransaction.exists({ user: userId, emailId: msg.id });
      if (exists) {
        duplicatesSkipped++;
        continue;
      }

      // Fetch Details
      const email = await fetchMessageDetails(msg.id, user);

      // Check Excluded Senders
      if (user.preferences.excludedSenders.includes(email.sender)) {
        continue;
      }

      // Parse Email
      const parser = detectParser(email.sender, email.subject);
      if (!parser) continue;

      const parsed = parser({ body: email.body, subject: email.subject, sender: email.sender, date: email.date, userName: user.name });
      if (!parsed) continue;

      transactionsDetected++;
      const parsedTxns = Array.isArray(parsed) ? parsed : [parsed];

      for (const txn of parsedTxns) {
        if (txn.category === "Other") {
          const catMatch = await categorizeTransaction(userId, {
            note: txn.note || txn.merchant,
            merchant: txn.merchant,
            amount: txn.amount,
            date: txn.date,
          });
          if (catMatch && catMatch.selected) {
            txn.category = catMatch.selected.category;
            txn.subCategory = catMatch.selected.subCategory;
          }
        }

        try {
          await ImportedTransaction.create({
            user: userId,
            emailId: email.id,
            source: txn.source,
            sourceDetail: txn.sourceDetail || `Email from ${email.sender}`,
            type: txn.type,
            amount: txn.amount,
            merchant: txn.merchant,
            date: txn.date,
            category: txn.category,
            subCategory: txn.subCategory,
            note: txn.note,
            confidence: txn.confidence,
            referenceId: txn.referenceId,
            status: "draft",
            isPersonal: txn.isPersonal || false,
            isJunk: txn.isJunk || false,
            tags: txn.tags || [],
            rawText: txn.rawText || email.body.substring(0, 300),
          });
          draftsCreated++;
          if (txn.type === "income") incomeCreated++;
          else expenseCreated++;
        } catch (err) {
          if (err.code === 11000) duplicatesSkipped++;
          else console.error("Error creating draft:", err.message);
        }
      }
    }

    user.googleAuth.lastScanAt = now;
    await user.save();

    await EmailScanLog.create({
      user: userId,
      emailsScanned: totalEmailsScanned,
      draftsCreated,
      duplicatesSkipped,
    });

    return {
      totalEmailsScanned,
      transactionsDetected,
      duplicatesSkipped,
      draftsCreated,
      breakdown: { income: incomeCreated, expense: expenseCreated }
    };
  } catch (err) {
    console.error(`Email scan failed for user ${userId}:`, err.message);
    // Mark disconnected if grant error
    if (err.code === 401 || err.message.includes("invalid_grant") || err.message.includes("revoked")) {
      user.googleAuth.isConnected = false;
      user.googleAuth.accessToken = null;
      user.googleAuth.refreshToken = null;
      await user.save();
    }
    throw err;
  }
};
