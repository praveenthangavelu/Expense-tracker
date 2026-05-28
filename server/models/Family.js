import mongoose from "mongoose";

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["admin", "member"],
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  inviteCode: {
    type: String,
    unique: true,
    required: true,
    length: 8,
  },
  settings: {
    membersCanViewFamilySummary: {
      type: Boolean,
      default: true,
    },
    monthlyBudget: {
      type: Number,
      default: 0, // 0 means no limit
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

familySchema.index({ "members.user": 1 });

const Family = mongoose.model("Family", familySchema);

export default Family;
