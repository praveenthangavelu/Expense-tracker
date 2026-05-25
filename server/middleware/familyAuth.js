/**
 * Middleware to check if the authenticated user is the Family Admin.
 */
export const isFamilyAdmin = (req, res, next) => {
  if (req.user?.familyRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only the family admin can perform this action.",
    });
  }
  next();
};

/**
 * Middleware to check if the authenticated user belongs to any family.
 */
export const isFamilyMember = (req, res, next) => {
  if (!req.user?.family) {
    return res.status(403).json({
      success: false,
      message: "You are not part of a family.",
    });
  }
  next();
};
