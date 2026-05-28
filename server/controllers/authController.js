// Import asyncHandler so thrown async errors are passed to the global error handler.
import asyncHandler from "../middleware/asyncHandler.js";

// Import the User model so this controller can create and find users.
import User from "../models/User.js";

// Import all auth service exports as authService, so we can call authService.generateToken().
import * as authService from "../services/authService.js";

// Import typed error classes for clean, consistent error throwing.
import { ConflictError, LockedError, UnauthorizedError } from "../utils/AppError.js";

// Shape the auth response in one place so register and login return the same structure.
const sendAuthResponse = (res, statusCode, user, token) => {
  res.status(statusCode).json({
    success: true,
    data: {
      // Password is intentionally NOT included in this response.
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        automationSettings: user.automationSettings,
      },
      token,
    },
  });
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for an existing email before creating the user.
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new ConflictError("Email already registered");
  }

  const user = await User.create({ name, email, password });
  const token = authService.generateToken(user._id);

  // 201 because a new user resource was created.
  sendAuthResponse(res, 201, user, token);
});

// POST /api/auth/login
// Includes account lockout: 5 failed attempts lock the account for 30 minutes.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch loginAttempts and lockUntil (both select: false) alongside the password hash.
  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil"
  );

  // Use the same error message for wrong email and wrong password.
  // Distinguishing them would let attackers enumerate registered emails.
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Check account lockout BEFORE comparing password to avoid leaking timing info.
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new LockedError(
      `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`
    );
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Record the failed attempt; this may lock the account.
    await user.incrementLoginAttempts();
    throw new UnauthorizedError("Invalid email or password");
  }

  // Successful login — clear the lockout counter.
  await user.resetLoginAttempts();

  const token = authService.generateToken(user._id);

  // 200 because login succeeds but no new resource is created.
  sendAuthResponse(res, 200, user, token);
});

// GET /api/auth/me
// The auth middleware already verified the token and attached req.user.
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

// PUT /api/auth/settings
export const updateSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (req.body) {
    user.automationSettings = {
      ...user.automationSettings,
      ...req.body,
    };
  }

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        currency: updatedUser.currency,
        automationSettings: updatedUser.automationSettings,
      },
    },
  });
});

// GET /api/auth/google/url
export const getGoogleLoginUrl = asyncHandler(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${req.headers.origin || "http://localhost:5173"}/login`;

  if (!clientId) {
    return res.status(200).json({
      success: true,
      url: "simulator",
      message: "No Google Client ID. Simulator mode available."
    });
  }

  // Scope: profile + email + gmail read-only
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/gmail.readonly&access_type=offline&prompt=consent`;

  res.json({ success: true, url });
});

// POST /api/auth/google/callback
export const googleLoginCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.headers.origin || "http://localhost:5173"}/login`;

  if (code === "simulator" || !clientId || !clientSecret) {
    // Find or create default simulator user
    let user = await User.findOne({ email: "praveentveluwork@gmail.com" });
    if (!user) {
      user = await User.create({
        name: "Praveen",
        email: "praveentveluwork@gmail.com",
        password: Math.random().toString(36).substring(2) + Date.now().toString(36),
      });
    }

    user.googleAuth = {
      isConnected: true,
      accessToken: "simulator_access_token",
      refreshToken: "simulator_refresh_token",
      lastScanAt: null,
      email: "praveentveluwork@gmail.com",
    };
    await user.save();

    const token = authService.generateToken(user._id);
    return sendAuthResponse(res, 200, user, token);
  }

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
    return res.status(400).json({ success: false, message: errorText || "Failed to exchange Google OAuth code" });
  }

  const data = await response.json();
  let email = "";
  let name = "";

  try {
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      email = info.email;
      name = info.name || info.given_name || "Google User";
    }
  } catch (err) {
    console.error("Failed to get Google profile info:", err.message);
  }

  if (!email) {
    return res.status(400).json({ success: false, message: "Could not retrieve email from Google" });
  }

  let user = await User.findOne({ email });
  let isNew = false;
  if (!user) {
    isNew = true;
    user = await User.create({
      name,
      email,
      password: Math.random().toString(36).substring(2) + Date.now().toString(36),
    });
  }

  user.googleAuth = {
    isConnected: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || user.googleAuth.refreshToken,
    lastScanAt: user.googleAuth.lastScanAt || null,
    email,
  };
  await user.save();

  const token = authService.generateToken(user._id);
  sendAuthResponse(res, isNew ? 201 : 200, user, token);
});
