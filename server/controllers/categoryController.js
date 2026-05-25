// Import asyncHandler so async errors are passed to the global error handler.
import asyncHandler from "../middleware/asyncHandler.js";

// Import the Category model so controllers can query and create categories.
import Category from "../models/Category.js";

// GET /api/categories
export const getAll = asyncHandler(async (req, res) => {
  // The OR query means users see their custom categories PLUS the app's default categories.
  // First condition: categories created by this user.
  // Second condition: default categories available to everyone.
  const categories = await Category.find({
    $or: [{ user: req.user.id }, { isDefault: true }],
  }).sort({ type: 1, name: 1 });

  res.status(200).json({
    success: true,
    data: categories,
  });
});

// POST /api/categories
export const create = asyncHandler(async (req, res) => {
  // Force user from req.user.id so users cannot create categories for someone else.
  // Force isDefault: false because users should not be able to create app-level default categories.
  const category = await Category.create({
    ...req.body,
    user: req.user.id,
    isDefault: false,
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

// DELETE /api/categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  // The query checks all three conditions:
  // 1. _id matches the category requested.
  // 2. user matches the logged-in user, so users cannot delete someone else's category.
  // 3. isDefault is false, so shared default categories cannot be deleted.
  const category = await Category.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
    isDefault: false,
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found or cannot delete default category",
    });
  }

  res.status(200).json({
    success: true,
    message: "Category deleted",
  });
});
