// Import Zod so we can define and run server-side validation schemas.
import { z } from "zod";

// Zod is a validation library that checks whether incoming data has the shape we expect.
// We validate on the server even if the frontend validates too because users can bypass the frontend
// and send requests directly with tools like Postman, curl, or a custom script.

// sanitizeString strips dangerous HTML/JS patterns from a single string value.
// This runs after Zod validation so we know the shape is correct before sanitizing.
const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/[<>]/g, "")            // strip HTML angle brackets
    .replace(/javascript:/gi, "")    // strip JS protocol (XSS via href/src)
    .replace(/on\w+\s*=/gi, "")      // strip inline event handlers (onclick=, onerror=, etc.)
    .trim();
};

// Recursively sanitize all string values in an object or array.
const deepSanitize = (value) => {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, deepSanitize(v)])
    );
  }
  return value;
};

// validate takes a Zod schema and returns Express middleware for that schema.
export const validate = (schema) => {
  // This returned function is the actual middleware Express runs for a request.
  return (req, res, next) => {
    // safeParse checks the data without throwing an exception.
    const result = schema.safeParse(req.body);

    // If validation failed, send a clear 400 response instead of letting bad data reach controllers.
    if (!result.success) {
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

    // Sanitize validated data to strip XSS payloads before controllers see it.
    req.body = deepSanitize(result.data);

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

  // Category may be omitted during create so the categorization engine can fill it.
  category: z.string().min(1, "Category is required").optional(),

  subCategory: z.string().optional().nullable(),

  // Note is optional, but when provided it cannot be longer than 200 characters.
  note: z.string().max(200, "Note cannot be more than 200 characters").optional(),

  merchant: z.string().max(200, "Merchant cannot be more than 200 characters").optional(),

  ocrText: z.string().max(2000, "OCR text cannot be more than 2000 characters").optional(),

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

export const categorizeSchema = z.object({
  note: z.string().max(200).optional().nullable(),
  merchant: z.string().max(200).optional().nullable(),
  ocrText: z.string().max(2000).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  date: z.string().optional().nullable(),
});

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

// Schema for dismissing a smart spending popup.
export const dismissPopupSchema = z.object({
  popupId: z.string().min(1, "Popup ID is required"),
});

// Savings Goal validation schemas
export const createSavingsGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(60, "Title is too long"),
  targetAmount: z.number().min(100, "Target amount must be at least 100"),
  duration: z.enum(["1_month", "3_months", "6_months", "1_year", "2_years", "custom"]),
  targetDate: z.string().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  autoDeduct: z.boolean().optional(),
  autoDeductFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  autoDeductAmount: z.number().min(0).optional(),
});

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial();

export const addSavingsSchema = z.object({
  amount: z.number().positive("Amount to add must be greater than 0"),
  note: z.string().max(200).optional(),
});

export const withdrawSavingsSchema = z.object({
  amount: z.number().positive("Amount to withdraw must be greater than 0"),
  note: z.string().max(200).optional(),
});

// Annual Plan validation schemas
export const createAnnualPlanSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  autoFill: z.boolean().optional(),
});

export const updateAnnualPlanMonthSchema = z.object({
  plannedIncome: z.number().min(0),
  expenses: z.array(
    z.object({
      category: z.string().min(1),
      amount: z.number().min(0),
      note: z.string().optional(),
    })
  ),
});

export const updateAnnualCategoryBudgetSchema = z.object({
  category: z.string().min(1),
  annualBudget: z.number().min(0),
});

// Monthly Plan validation schemas
export const createMonthlyPlanSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  plannedIncome: z.number().min(0).optional(),
  autoGenerate: z.boolean().optional(),
});

export const updateMonthlyPlanBudgetSchema = z.object({
  category: z.string().min(1),
  budgetAmount: z.number().min(0),
});

export const addMonthlyRuleSchema = z.object({
  type: z.enum(["daily_limit", "category_cap", "no_spend_day", "weekly_limit"]),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const applyRebalanceSchema = z.object({
  reallocations: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      amount: z.number().positive(),
    })
  ),
});

// Automation Settings validation schema
export const updateAutomationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  morningBrief: z.boolean().optional(),
  weeklyReview: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  budgetAlerts: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  healthTips: z.boolean().optional(),
  patternAlerts: z.boolean().optional(),
  noSpendReminders: z.boolean().optional(),
  paydayDate: z.number().int().min(1).max(31).optional(),
  paydayAmount: z.number().min(0).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

export const confirmTransactionSchema = z.object({
  receiptId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format"),
  transactionData: z.object({
    type: z.enum(["income", "expense"]),
    amount: z.number().positive(),
    category: z.string().min(1),
    subCategory: z.string().optional().nullable(),
    note: z.string().max(200).optional(),
    date: z.string().optional(),
  }),
});


