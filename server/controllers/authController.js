// Import asyncHandler so thrown async errors are passed to the global error handler.
import asyncHandler from "../middleware/asyncHandler.js";

// Import the User model so this controller can create and find users.
import User from "../models/User.js";

// Import all auth service exports as authService, so we can call authService.generateToken().
import * as authService from "../services/authService.js";

// Shape the auth response in one place so register and login return the same structure.
const sendAuthResponse = (res, statusCode, user, token) => {
  res.status(statusCode).json({
    success: true,
    data: {
      // Password is intentionally NOT included in this response.
      // Even hashed passwords should never be sent to the frontend.
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
      token,
    },
  });
};

// Register flow:
// 1. User submits name, email, and password.
// 2. Server stores the user and the User pre-save hook hashes the password.
// 3. Server returns a JWT.
// 4. Frontend stores the token and sends it with protected requests as "Bearer <token>".
// 5. Server verifies that token before allowing access to protected data.
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for an existing email before creating the user so we can return a friendly message.
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  // Create the user with the plain password from the request.
  // The User model's pre-save hook hashes the password before it reaches MongoDB.
  const user = await User.create({
    name,
    email,
    password,
  });

  // Generate a signed JWT that contains the user's id.
  const token = authService.generateToken(user._id);

  // Return 201 because a new user resource was created.
  sendAuthResponse(res, 201, user, token);
});

// Login flow:
// 1. User sends email and password.
// 2. Server finds the user by email.
// 3. Server compares the entered password with the stored bcrypt hash.
// 4. Server returns a new JWT if the credentials are valid.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // User.password has select: false in the schema, so normal queries do not include it.
  // We use select("+password") here because login is the one place we need the hash for comparison.
  const user = await User.findOne({ email }).select("+password");

  // Use the same message for wrong email and wrong password.
  // If we said which one was wrong, attackers could test emails and discover registered accounts.
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // matchPassword uses bcrypt.compare() from the User model instance method.
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate a fresh token for this login session.
  const token = authService.generateToken(user._id);

  // Return 200 because login succeeded but did not create a new user.
  sendAuthResponse(res, 200, user, token);
});

// getMe returns the logged-in user's profile.
// The auth middleware already verified the token and attached the user to req.user.
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});
