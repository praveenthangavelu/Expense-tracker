import mongoose from "mongoose";

const userChallengeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    current: {
      type: Number,
      default: 0,
    },
    target: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    dailyLog: [
      {
        date: { type: Date, required: true },
        value: { type: Number, required: true },
        passed: { type: Boolean, required: true },
      },
    ],
  },
  status: {
    type: String,
    enum: ["active", "completed", "failed", "abandoned"],
    default: "active",
  },
  completedAt: {
    type: Date,
    default: null,
  },
  xpAwarded: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userChallengeSchema.index({ user: 1, status: 1 });
userChallengeSchema.index({ user: 1, challenge: 1 }, { unique: true });

const UserChallenge = mongoose.model("UserChallenge", userChallengeSchema);
export default UserChallenge;
