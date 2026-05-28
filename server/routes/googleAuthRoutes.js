import express from "express";
import { auth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import ImportedTransaction from "../models/ImportedTransaction.js";
import EmailScanLog from "../models/EmailScanLog.js";
import { scanEmails } from "../services/emailScanner.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

router.use(auth);

// GET /api/google/url
router.get("/url", asyncHandler(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin || "http://localhost:5173"}/settings`;
  
  if (!clientId) {
    return res.status(200).json({
      success: true,
      url: "simulator",
      message: "No Google Client ID. Simulator mode available."
    });
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/userinfo.email&access_type=offline&prompt=consent`;
  
  res.json({ success: true, url });
}));

// POST /api/google/connect
router.post("/connect", asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (code === "simulator" || !clientId || !clientSecret) {
    user.googleAuth = {
      isConnected: true,
      accessToken: "simulator_access_token",
      refreshToken: "simulator_refresh_token",
      lastScanAt: null,
      email: "praveentveluwork@gmail.com",
    };
    await user.save();
    return res.json({ success: true, message: "Connected in simulation mode successfully!", user });
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin || "http://localhost:5173"}/settings`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(400).json({ success: false, message: errorText || "Failed to connect Google account" });
  }

  const data = await response.json();
  let email = "connected-gmail@gmail.com";

  try {
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      email = info.email;
    }
  } catch (err) {
    console.error("Failed to get Google profile email:", err.message);
  }

  user.googleAuth = {
    isConnected: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || user.googleAuth.refreshToken,
    lastScanAt: null,
    email,
  };
  await user.save();

  res.json({ success: true, message: "Google account connected!", user });
}));

// POST /api/google/disconnect
router.post("/disconnect", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.googleAuth = {
    isConnected: false,
    accessToken: null,
    refreshToken: null,
    lastScanAt: null,
    email: null,
  };
  await user.save();

  // Remove any drafts
  await ImportedTransaction.deleteMany({ user: req.user.id, status: "draft" });

  res.json({ success: true, message: "Google account disconnected successfully!", user });
}));

// POST /api/google/scan
router.post("/scan", asyncHandler(async (req, res) => {
  const result = await scanEmails(req.user.id, 7); // Scan past 7 days on manual trigger
  res.json({ success: true, data: result });
}));

// GET /api/google/logs
router.get("/logs", asyncHandler(async (req, res) => {
  const logs = await EmailScanLog.find({ user: req.user.id })
    .sort({ timestamp: -1 })
    .limit(20);
  res.json({ success: true, data: logs });
}));

// GET /api/google/drafts
router.get("/drafts", asyncHandler(async (req, res) => {
  const drafts = await ImportedTransaction.find({ user: req.user.id, status: "draft" })
    .sort({ date: -1 });
  res.json({ success: true, data: drafts });
}));

// POST /api/google/drafts/:id/confirm
router.post("/drafts/:id/confirm", asyncHandler(async (req, res) => {
  const draft = await ImportedTransaction.findOne({ _id: req.params.id, user: req.user.id });
  if (!draft) return res.status(404).json({ success: false, message: "Draft transaction not found" });

  const transaction = await Transaction.create({
    user: req.user.id,
    type: draft.type,
    amount: draft.amount,
    category: draft.category,
    subCategory: draft.subCategory,
    note: draft.note || draft.merchant,
    date: draft.date,
  });

  draft.status = "confirmed";
  await draft.save();

  res.json({ success: true, data: transaction });
}));

// PUT /api/google/drafts/:id
router.put("/drafts/:id", asyncHandler(async (req, res) => {
  const draft = await ImportedTransaction.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: req.body },
    { new: true }
  );

  if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
  res.json({ success: true, data: draft });
}));

// DELETE /api/google/drafts/:id
router.delete("/drafts/:id", asyncHandler(async (req, res) => {
  const draft = await ImportedTransaction.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: { status: "rejected" } },
    { new: true }
  );

  if (!draft) return res.status(404).json({ success: false, message: "Draft not found" });
  res.json({ success: true, message: "Draft transaction rejected" });
}));

// POST /api/google/preferences
router.post("/preferences", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.preferences = {
    ...user.preferences,
    ...req.body,
  };
  await user.save();

  res.json({ success: true, data: user.preferences });
}));

// POST /api/google/excluded-senders
router.post("/excluded-senders", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (email && !user.preferences.excludedSenders.includes(email)) {
    user.preferences.excludedSenders.push(email);
    await user.save();
  }

  res.json({ success: true, data: user.preferences.excludedSenders });
}));

// DELETE /api/google/excluded-senders
router.delete("/excluded-senders", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.preferences.excludedSenders = user.preferences.excludedSenders.filter(e => e !== email);
  await user.save();

  res.json({ success: true, data: user.preferences.excludedSenders });
}));

export default router;
