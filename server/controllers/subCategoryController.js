import asyncHandler from "../middleware/asyncHandler.js";
import SubCategory from "../models/SubCategory.js";

// GET /api/subcategories
// Query: ?parentCategory=Food
export const getAll = asyncHandler(async (req, res) => {
  const { parentCategory } = req.query;

  if (!parentCategory) {
    return res.status(400).json({
      success: false,
      message: "parentCategory query parameter is required.",
    });
  }

  const subCategories = await SubCategory.find({
    parentCategory,
    $or: [{ user: req.user.id }, { isDefault: true }],
  }).sort({ isDefault: -1, name: 1 });

  res.status(200).json({
    success: true,
    data: subCategories,
  });
});

// POST /api/subcategories
export const create = asyncHandler(async (req, res) => {
  const { parentCategory, name, icon } = req.body;

  // Check for duplicates
  const existing = await SubCategory.findOne({
    parentCategory,
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") }, // Case-insensitive duplicate check
    $or: [{ user: req.user.id }, { isDefault: true }],
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Subcategory "${name}" already exists.`,
    });
  }

  const subCategory = await SubCategory.create({
    parentCategory,
    name: name.trim(),
    icon: icon || "🍽️",
    user: req.user.id,
    isDefault: false,
  });

  res.status(201).json({
    success: true,
    data: subCategory,
  });
});

// DELETE /api/subcategories/:id
export const deleteSubCategory = asyncHandler(async (req, res) => {
  const subCategory = await SubCategory.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
    isDefault: false, // Prevent deleting defaults
  });

  if (!subCategory) {
    return res.status(404).json({
      success: false,
      message: "Subcategory not found or cannot delete default subcategory.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Subcategory deleted successfully.",
  });
});
