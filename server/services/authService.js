// Import jsonwebtoken so we can create signed JWT strings for logged-in users.
import jwt from "jsonwebtoken";

// Import crypto for generating unique token IDs (jti claim).
import crypto from "crypto";

// generateToken creates a JWT for one user id.
// Security enhancements:
//   jti (JWT ID) — a unique identifier per token, prevents token replay attacks.
//   algorithm: 'HS256' — explicit algorithm prevents algorithm confusion attacks where
//     an attacker changes the header to 'none' or 'RS256' to bypass signature verification.
export const generateToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      // jti makes each token unique even for the same user.
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
      algorithm: "HS256",
    }
  );
};

// Export an object too, so controllers can call authService.generateToken().
export default {
  generateToken,
};
