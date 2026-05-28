// Import jsonwebtoken so we can verify JWTs sent by the frontend.
import jwt from "jsonwebtoken";

// Import the User model so we can load the authenticated user's latest database record.
import User from "../models/User.js";

// Authentication answers: "Who are you?"
// Authorization answers: "What are you allowed to access?"
// This middleware handles authentication by proving the request belongs to a real logged-in user.
export const auth = async (req, res, next) => {
  // The Authorization header commonly looks like: "Bearer eyJhbGciOi..."
  const authHeader = req.headers.authorization;

  // "Bearer" means "the bearer of this token is allowed to use it."
  // It is the standard convention for sending access tokens in HTTP Authorization headers.
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  // If no token is present, the request cannot prove who the user is.
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided",
    });
  }

  try {
    // jwt.verify() checks the token signature using JWT_SECRET.
    // algorithms: ['HS256'] explicitly restricts which algorithms are accepted.
    // Without this, an attacker could craft a token with alg: 'none' to bypass signature verification.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // If JWT_SECRET is compromised, attackers could sign fake tokens.
    // That is why JWT_SECRET must stay private and should be rotated if it is ever exposed.

    // Find the user from the id stored in the token payload.
    // The User schema has password select: false, and select("-password") makes that intent explicit here.
    const user = await User.findById(decoded.id).select("-password");

    // A valid token might point to a user that was deleted after the token was created.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    // Attach the user to req.user so later middleware and controllers can access the logged-in user.
    // Example: getMe can return req.user, and transaction routes can query by req.user._id.
    req.user = user;

    // Continue to the next middleware or controller.
    next();
  } catch (error) {
    // Invalid, expired, or tampered tokens all end up here.
    return res.status(401).json({
      success: false,
      message: "Not authorized, token is invalid or expired",
    });
  }
};

// Export auth as the default too, so route files can import it either way.
export default auth;
