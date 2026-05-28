import mongoose from "mongoose";

const emailScanLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  emailsScanned: {
    type: Number,
    default: 0,
  },
  draftsCreated: {
    type: Number,
    default: 0,
  },
  duplicatesSkipped: {
    type: Number,
    default: 0,
  },
});

emailScanLogSchema.index({ user: 1, timestamp: -1 });

const EmailScanLog = mongoose.model("EmailScanLog", emailScanLogSchema);

export default EmailScanLog;
