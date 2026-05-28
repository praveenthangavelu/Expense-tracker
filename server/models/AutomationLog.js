import mongoose from "mongoose";

const automationLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  icon: {
    type: String,
    required: true,
    default: "🤖",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  popup: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

automationLogSchema.index({ user: 1, timestamp: -1 });

const AutomationLog = mongoose.model("AutomationLog", automationLogSchema);
export default AutomationLog;
