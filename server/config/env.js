// Validates all required environment variables at startup.
// Called in server.js before connecting to the database or starting Express.
// Exits immediately with a clear message if anything is missing or invalid.

const requiredVars = [
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRE",
  "CLIENT_URL",
  "NODE_ENV",
];

export const validateEnv = () => {
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables: ${missing.join(", ")}\n` +
        `   Please check your .env file.\n`
    );
    process.exit(1);
  }

  // JWT_SECRET should be long enough to resist brute-force attacks.
  if (process.env.JWT_SECRET.length < 32) {
    console.error(
      "\n❌ JWT_SECRET must be at least 32 characters long.\n" +
        "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    );
    process.exit(1);
  }

  // Basic sanity check — catches typos like "mongo://" or missing the protocol.
  if (!process.env.MONGO_URI.startsWith("mongodb")) {
    console.error(
      "\n❌ MONGO_URI must be a valid MongoDB connection string (starts with mongodb:// or mongodb+srv://).\n"
    );
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
};
