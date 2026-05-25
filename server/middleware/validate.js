// Import Zod so we can define and run server-side validation schemas.
import { z } from "zod";

// Zod is a validation library that checks whether incoming data has the shape we expect.
// We validate on the server even if the frontend validates too because users can bypass the frontend
// and send requests directly with tools like Postman, curl, or a custom script.

// validate takes a Zod schema and returns Express middleware for that schema.
export const validate = (schema) => {
  // This returned function is the actual middleware Express runs for a request.
  return (req, res, next) => {
    // safeParse checks the data without throwing an exception.
    // parse would throw on invalid data, while safeParse returns { success: false, error }.
    const result = schema.safeParse(req.body);

    // If validation failed, send a clear 400 response instead of letting bad data reach controllers.
    if (!result.success) {
      // Convert Zod issues into a simple list the frontend can display field by field.
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    // Replace req.body with Zod's parsed result.
    // This is a small form of sanitization because controllers receive cleaned, validated data only.
    req.body = result.data;

    // Continue to the next middleware or controller.
    next();
  };
};

// Schema for registering a new user.
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot be more than 50 characters"),
  email: z.email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for logging in an existing user.
export const loginSchema = z.object({
  email: z.email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Base transaction schema shared by create and update validation.
const transactionSchema = z.object({
  // enum allows only "income" or "expense", preventing invalid transaction types.
  type: z.enum(["income", "expense"], {
    message: "Type must be either income or expense",
  }),

  // positive means the amount must be greater than 0.
  amount: z.number().positive("Amount must be greater than 0"),

  // Category must be a non-empty string.
  category: z.string().min(1, "Category is required"),

  // Note is optional, but when provided it cannot be longer than 200 characters.
  note: z.string().max(200, "Note cannot be more than 200 characters").optional(),

  // Date is optional, but when provided it must be a valid ISO datetime string.
  date: z.string().datetime("Date must be a valid datetime string").optional(),
});

// Schema for creating a transaction; all required fields from transactionSchema must be present.
export const createTransactionSchema = transactionSchema;

// Schema for updating a transaction; every field is optional because users may update only one field.
export const updateTransactionSchema = transactionSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field must be provided",
  },
);

// Schema for creating a custom category.
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(30, "Category name cannot be more than 30 characters"),
  type: z.enum(["income", "expense"], {
    message: "Type must be either income or expense",
  }),
  icon: z.string().min(1, "Icon is required").optional(),
});

// Schema for joining a family.
export const joinFamilySchema = z.object({
  inviteCode: z.string().length(8, "Invite code must be exactly 8 characters"),
});

// Schema for updating family settings.
export const updateFamilySettingsSchema = z.object({
  membersCanViewFamilySummary: z.boolean().optional(),
  monthlyBudget: z.number().min(0, "Monthly budget must be 0 or greater").optional(),
});

// Schema for transferring family admin.
export const transferAdminSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

// Schema for creating a subcategory.
export const createSubCategorySchema = z.object({
  parentCategory: z.string().min(1, "Parent category is required"),
  name: z
    .string()
    .min(1, "Subcategory name is required")
    .max(30, "Subcategory name cannot be more than 30 characters"),
  icon: z.string().optional(),
});

// Schema for setting budget.
export const setBudgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  overall: z.number().min(0).optional(),
  categories: z
    .array(
      z.object({
        category: z.string().min(1, "Category is required"),
        limit: z.number().min(0, "Limit must be 0 or greater"),
      })
    )
    .optional(),
});

// Schema for creating a recurring transaction.
export const createRecurringSchema = z.object({
  type: z.enum(["income", "expense"], {
    message: "Type must be either income or expense",
  }),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional().nullable(),
  note: z.string().max(200, "Note cannot be more than 200 characters").optional().nullable(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "yearly"]),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date").optional().nullable(),
});

// Schema for updating a recurring transaction.
export const updateRecurringSchema = createRecurringSchema.partial();
