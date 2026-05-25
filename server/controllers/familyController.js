import crypto from "crypto";
import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";
import Family from "../models/Family.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import {
  getFamilyFoodBreakdown,
  getFamilyFoodBreakdownCombined,
} from "../services/transactionService.js";

// Helper to get month range
const getMonthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

// POST /api/family
// Only users NOT already in a family can create one.
export const createFamily = asyncHandler(async (req, res) => {
  // Reload user to ensure family is fresh
  const user = await User.findById(req.user.id);
  if (user.family) {
    return res.status(400).json({
      success: false,
      message: "You are already in a family.",
    });
  }

  // Generate unique 8-character invite code
  const inviteCode = crypto.randomBytes(4).toString("hex");

  const family = await Family.create({
    name: req.body.name,
    admin: req.user.id,
    members: [{ user: req.user.id, role: "admin", joinedAt: new Date() }],
    inviteCode,
  });

  // Update user model references
  user.family = family._id;
  user.familyRole = "admin";
  await user.save();

  res.status(201).json({
    success: true,
    data: family,
  });
});

// POST /api/family/join
// Takes inviteCode in the body.
export const joinFamily = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  const user = await User.findById(req.user.id);
  if (user.family) {
    return res.status(400).json({
      success: false,
      message: "You are already in a family. Leave your current family first.",
    });
  }

  const family = await Family.findOne({ inviteCode });
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Invalid invite code.",
    });
  }

  // Add user to family members list
  family.members.push({
    user: req.user.id,
    role: "member",
    joinedAt: new Date(),
  });
  await family.save();

  // Update user model references
  user.family = family._id;
  user.familyRole = "member";
  await user.save();

  res.status(200).json({
    success: true,
    data: family,
  });
});

// POST /api/family/leave
export const leaveFamily = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.family) {
    return res.status(400).json({
      success: false,
      message: "You are not in a family.",
    });
  }

  const family = await Family.findById(user.family);
  if (!family) {
    // If family record is missing, clear references on user anyway
    user.family = null;
    user.familyRole = null;
    await user.save();
    return res.status(200).json({ success: true, message: "Left family." });
  }

  if (user.familyRole === "admin") {
    // If admin, check if there are other members
    if (family.members.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Transfer admin role before leaving.",
      });
    } else {
      // Admin is the last member, delete the family
      await Family.findByIdAndDelete(family._id);
    }
  } else {
    // Regular member leaving
    family.members = family.members.filter(
      (m) => m.user.toString() !== req.user.id
    );
    await family.save();
  }

  // Clear references on leaving user
  user.family = null;
  user.familyRole = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Left family successfully.",
  });
});

// DELETE /api/family/members/:userId
// Admin only.
export const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "Cannot remove yourself. Use leave family instead.",
    });
  }

  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  // Check if member actually exists in family
  const isMember = family.members.some((m) => m.user.toString() === userId);
  if (!isMember) {
    return res.status(400).json({
      success: false,
      message: "User is not a member of this family.",
    });
  }

  // Remove from family member list
  family.members = family.members.filter((m) => m.user.toString() !== userId);
  await family.save();

  // Clear user model references
  await User.findByIdAndUpdate(userId, {
    family: null,
    familyRole: null,
  });

  res.status(200).json({
    success: true,
    message: "Member removed successfully.",
  });
});

// PUT /api/family/transfer-admin
// Admin only.
export const transferAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You are already the admin.",
    });
  }

  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  // Check if target user is in the family
  const memberIndex = family.members.findIndex(
    (m) => m.user.toString() === userId
  );
  if (memberIndex === -1) {
    return res.status(400).json({
      success: false,
      message: "Target user is not a member of this family.",
    });
  }

  // Update roles in family document
  family.admin = userId;
  family.members = family.members.map((m) => {
    if (m.user.toString() === req.user.id) {
      m.role = "member";
    } else if (m.user.toString() === userId) {
      m.role = "admin";
    }
    return m;
  });
  await family.save();

  // Update user model roles
  await User.findByIdAndUpdate(req.user.id, { familyRole: "member" });
  await User.findByIdAndUpdate(userId, { familyRole: "admin" });

  res.status(200).json({
    success: true,
    data: family,
  });
});

// GET /api/family
// Return the user's family with all member details populated (name, email).
export const getFamily = asyncHandler(async (req, res) => {
  const family = await Family.findById(req.user.family).populate(
    "members.user",
    "name email"
  );

  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  // Convert family mongoose document to object so we can conditionally delete inviteCode
  const familyObj = family.toObject();

  // Include invite code only if requester is admin
  if (req.user.familyRole !== "admin") {
    delete familyObj.inviteCode;
  }

  res.status(200).json({
    success: true,
    data: familyObj,
  });
});

// POST /api/family/regenerate-code
// Admin only.
export const regenerateInviteCode = asyncHandler(async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  const newInviteCode = crypto.randomBytes(4).toString("hex");
  family.inviteCode = newInviteCode;
  await family.save();

  res.status(200).json({
    success: true,
    data: { inviteCode: newInviteCode },
  });
});

// GET /api/family/summary
// Admin only (or members if settings.membersCanViewFamilySummary is true).
export const getFamilySummary = asyncHandler(async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  // Authorization check
  if (
    req.user.familyRole !== "admin" &&
    !family.settings.membersCanViewFamilySummary
  ) {
    return res.status(403).json({
      success: false,
      message: "Only family admin can view this summary.",
    });
  }

  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const { start, end } = getMonthRange(month, year);
  const memberIds = family.members.map((m) => m.user);

  // Fetch member users to create name mappings
  const users = await User.find({ _id: { $in: memberIds } }).select("name email");
  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = user.name;
    return acc;
  }, {});

  // 1. Combined Family Balance
  const balanceAgg = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totalIncome = balanceAgg.find((item) => item._id === "income")?.total || 0;
  const totalExpense = balanceAgg.find((item) => item._id === "expense")?.total || 0;
  const familyBalance = {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };

  // 2. Per-Member Breakdown (Income / Expense / Balance)
  const memberAgg = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { user: "$user", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Construct final array from users list
  const memberBreakdown = users.map((user) => {
    const userIdStr = user._id.toString();
    const inc = memberAgg.find((m) => m._id.user.toString() === userIdStr && m._id.type === "income")?.total || 0;
    const exp = memberAgg.find((m) => m._id.user.toString() === userIdStr && m._id.type === "expense")?.total || 0;
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      income: inc,
      expense: exp,
      balance: inc - exp,
    };
  });

  // 3. Family Category Breakdown
  const familyCategoryBreakdown = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  // 4. Per-Member Category Breakdown
  const memberCatAgg = await Transaction.aggregate([
    {
      $match: {
        user: { $in: memberIds },
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { user: "$user", category: "$category" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const memberCategoryBreakdown = memberCatAgg.map((item) => ({
    userId: item._id.user,
    name: userMap[item._id.user.toString()] || "Unknown Member",
    category: item._id.category,
    total: item.total,
  }));

  // 5. Food Subcategory Aggregation (Feature 2)
  const familyFoodBreakdown = await getFamilyFoodBreakdownCombined(
    memberIds,
    month,
    year
  );
  
  const memberFoodRaw = await getFamilyFoodBreakdown(memberIds, month, year);
  const memberFoodBreakdown = memberFoodRaw.map((item) => ({
    userId: item._id.user,
    name: userMap[item._id.user.toString()] || "Unknown Member",
    subCategory: item._id.subCategory || "Uncategorized",
    total: item.total,
    count: item.count,
  }));

  res.status(200).json({
    success: true,
    data: {
      familyBalance,
      memberBreakdown,
      familyCategoryBreakdown,
      memberCategoryBreakdown,
      familyFoodBreakdown,
      memberFoodBreakdown,
    },
  });
});

// PUT /api/family/settings
// Admin only.
export const updateFamilySettings = asyncHandler(async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    return res.status(404).json({
      success: false,
      message: "Family not found.",
    });
  }

  if (req.body.membersCanViewFamilySummary !== undefined) {
    family.settings.membersCanViewFamilySummary =
      req.body.membersCanViewFamilySummary;
  }

  if (req.body.monthlyBudget !== undefined) {
    family.settings.monthlyBudget = req.body.monthlyBudget;
  }

  await family.save();

  res.status(200).json({
    success: true,
    data: family,
  });
});
