// Import jsonwebtoken so we can create signed JWT strings for logged-in users.
import jwt from "jsonwebtoken";

// generateToken creates a JWT for one user id.
export const generateToken = (userId) => {
  // A JWT has three parts:
  // 1. Header: says the token type is JWT and which algorithm is used.
  // 2. Payload: stores data we want to carry, such as the user's id.
  // 3. Signature: proves the token was created by our server and was not changed.
  //
  // "Signing" means jsonwebtoken uses JWT_SECRET to create the signature.
  // Later, jwt.verify() uses the same secret to check that the token is still trusted.
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    },
  );
};

// Export an object too, so controllers can call authService.generateToken().
export default {
  generateToken,
};
