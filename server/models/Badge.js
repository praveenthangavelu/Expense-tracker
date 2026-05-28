import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  icon: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["milestone", "streak", "budget", "savings", "health", "social", "scanner", "special"],
  },
  tier: {
    type: String,
    required: true,
    enum: ["bronze", "silver", "gold", "platinum", "diamond"],
  },
  xpReward: {
    type: Number,
    required: true,
    default: 0,
  },
  condition: {
    type: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
  },
  isSecret: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Badge = mongoose.model("Badge", badgeSchema);
export default Badge;
