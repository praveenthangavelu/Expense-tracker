import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  parentCategory: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },
  icon: {
    type: String,
    default: "🍽️",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

subCategorySchema.index({ parentCategory: 1, name: 1, user: 1 }, { unique: true });

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

export default SubCategory;
