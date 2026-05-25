// Import mongoose so we can define a schema and create a MongoDB model.
import mongoose from "mongoose";

// A schema describes the structure and validation rules for a MongoDB document.
const transactionSchema = new mongoose.Schema({
  // Link this transaction to the user who owns it.
  user: {
    // ObjectId stores the _id value of another MongoDB document.
    type: mongoose.Schema.Types.ObjectId,

    // ref: "User" tells Mongoose this ObjectId points to a document in the User model.
    // This link lets us later populate user details or fetch only one user's transactions.
    ref: "User",

    // Every transaction must belong to a user.
    required: true,

    // This single-field index helps MongoDB quickly find transactions for one user.
    // Without an index, MongoDB may need to scan every transaction document one by one.
    index: true,
  },

  // Store whether this transaction adds money or spends money.
  type: {
    type: String,
    required: true,

    // enum validation allows only these exact values.
    // This prevents invalid types like "spent", "deposit", or spelling mistakes.
    enum: ["income", "expense"],
  },

  // Store the transaction amount.
  amount: {
    type: Number,
    required: true,

    // min prevents zero or negative transactions.
    min: 0.01,
  },

  // Store the category name, such as Food, Salary, or Transport.
  category: {
    type: String,
    required: true,

    // trim removes extra spaces from the start and end of the category name.
    trim: true,
  },

  // Store an optional sub-category name (currently only for Food).
  subCategory: {
    type: String,
    trim: true,
    default: null,
  },

  // Store an optional note about this transaction.
  note: {
    type: String,
    trim: true,
    maxlength: 200,
    default: "",
  },

  // Store the date the income or expense happened.
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // Store when this transaction record was created in the database.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// An index is like a lookup table MongoDB keeps to find documents faster.
// This compound index uses two fields together: user and date.
// It helps fetch one user's transactions already ordered by newest date first.
transactionSchema.index({ user: 1, date: -1 });

// In index definitions, 1 means ascending order and -1 means descending order.
// Here user: 1 groups by user, while date: -1 sorts that user's results newest first.

// A compound index uses multiple fields together, unlike a single-field index such as user only.
// This one helps category reports, such as "show all Food expenses for this user".
transactionSchema.index({ user: 1, category: 1 });

// This compound index helps category/subcategory breakdowns, such as "show all Food subcategory expenses for this user".
transactionSchema.index({ user: 1, category: 1, subCategory: 1 });

// Create the Transaction model from the schema so the app can create and query transactions.
const Transaction = mongoose.model("Transaction", transactionSchema);

// Export the model so controllers and routes can import it later.
export default Transaction;
