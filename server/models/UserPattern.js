import mongoose from "mongoose";

const userPatternSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  inputText: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  matchField: {
    type: String,
    required: true,
    enum: ["note", "merchant", "ocr_text"],
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  subCategory: {
    type: String,
    default: null,
    trim: true,
  },
  frequency: {
    type: Number,
    default: 1,
  },
  correctionCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  confidence: {
    type: Number,
    default: 0.5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userPatternSchema.index({ user: 1, inputText: 1 }, { unique: true });
userPatternSchema.index({ user: 1, category: 1 });
userPatternSchema.index({ user: 1, frequency: -1 });

const UserPattern = mongoose.model("UserPattern", userPatternSchema);
export default UserPattern;
