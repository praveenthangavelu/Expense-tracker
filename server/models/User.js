// Import bcryptjs so we can safely hash passwords and compare password hashes.
import bcrypt from "bcryptjs";

// Import mongoose so we can define a schema and create a MongoDB model.
import mongoose from "mongoose";

// A schema describes the shape of documents inside a MongoDB collection.
const userSchema = new mongoose.Schema({
  // Store the user's display name.
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },

  // Store the user's email address.
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // Store the user's password as a hash, not as plain text.
  password: {
    type: String,
    required: true,
    minlength: 6,
    // select: false means Mongoose will not include this field in normal query results.
    select: false,
  },

  // Store the user's preferred currency for displaying expenses.
  currency: {
    type: String,
    default: "INR",
    enum: ["INR", "USD", "EUR", "GBP"],
  },

  // Store the family relation.
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Family",
    default: null,
  },

  // Store the role of user in the family.
  familyRole: {
    type: String,
    enum: ["admin", "member", null],
    default: null,
  },

  // Store dismissed popup IDs to avoid repeating them.
  dismissedPopups: {
    type: [String],
    default: [],
  },

  automationSettings: {
    enabled: { type: Boolean, default: true },
    morningBrief: { type: Boolean, default: true },
    weeklyReview: { type: Boolean, default: true },
    monthlyReport: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    goalReminders: { type: Boolean, default: true },
    healthTips: { type: Boolean, default: true },
    patternAlerts: { type: Boolean, default: true },
    noSpendReminders: { type: Boolean, default: true },
    paydayDate: { type: Number, default: 1, min: 1, max: 31 },
    paydayAmount: { type: Number, default: 0 },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "08:00" }
  },

  googleAuth: {
    isConnected: { type: Boolean, default: false },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    lastScanAt: { type: Date, default: null },
    email: { type: String, default: null },
  },

  preferences: {
    autoEmailScan: { type: Boolean, default: true },
    notifyEmailScan: { type: Boolean, default: true },
    excludedSenders: { type: [String], default: [] },
  },

  xp: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  badges: [
    {
      badge: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Badge",
      },
      earnedAt: {
        type: Date,
        default: Date.now,
      },
      seen: {
        type: Boolean,
        default: false,
      },
    },
  ],
  streaks: {
    logging: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastLogDate: { type: Date, default: null },
    },
    underBudget: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastCheckDate: { type: Date, default: null },
    },
    noJunkFood: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastCheckDate: { type: Date, default: null },
    },
    noSpend: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastNoSpendDate: { type: Date, default: null },
    },
    savingsGoal: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastAddDate: { type: Date, default: null },
    },
  },

  // ─── Account Lockout Fields ───────────────────────────────────────────────
  // Track consecutive failed login attempts. Hidden from normal queries.
  loginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },

  // The datetime until which this account is locked. Hidden from normal queries.
  lockUntil: {
    type: Date,
    select: false,
  },
  // ──────────────────────────────────────────────────────────────────────────

  // Store when the user document was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email is already unique: true which creates an index; explicit compound if needed.
// family index helps queries that look up all members of a family.
userSchema.index({ family: 1 });
// ─────────────────────────────────────────────────────────────────────────────

// ─── Password Hashing Hook ────────────────────────────────────────────────────
// Use higher bcrypt rounds in production for stronger hashing at the cost of CPU.
const SALT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

userSchema.pre("save", async function () {
  // Only hash the password if it is new or has been changed.
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Instance Methods ─────────────────────────────────────────────────────────

// matchPassword compares a plain-text password against the stored bcrypt hash.
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// incrementLoginAttempts is called after each failed login.
// After 5 failures the account is locked for 30 minutes.
userSchema.methods.incrementLoginAttempts = async function () {
  // If a previous lock has expired, reset the counter and start fresh.
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock the account once we reach 5 failed attempts.
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// resetLoginAttempts is called after a successful login.
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};
// ─────────────────────────────────────────────────────────────────────────────

// Create the User model from the schema.
const User = mongoose.model("User", userSchema);

export default User;
