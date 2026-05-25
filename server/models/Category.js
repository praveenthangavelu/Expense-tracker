// Import mongoose so we can define a schema and create a MongoDB model.
import mongoose from "mongoose";

// A schema describes the fields each category document can have.
const categorySchema = new mongoose.Schema({
  // Link this category to the user who owns it.
  user: {
    // ObjectId stores the _id value of another MongoDB document.
    type: mongoose.Schema.Types.ObjectId,

    // ref: "User" tells Mongoose this ObjectId points to a User document.
    // This creates a relationship between Category and User without copying all user data.
    ref: "User",

    // Every category must belong to a user.
    required: true,
  },

  // Store the category name, such as Food, Rent, Salary, or Gift.
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },

  // Store whether this category is for income or expense transactions.
  type: {
    type: String,
    required: true,

    // enum validation allows only these exact values.
    // This keeps category data consistent and prevents accidental invalid types.
    enum: ["income", "expense"],
  },

  // Store the icon shown beside this category in the app.
  icon: {
    type: String,
    default: "📌",
  },

  // Track whether this category came from the app's default category list.
  isDefault: {
    type: Boolean,
    default: false,
  },

  // Store when this category record was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// A compound index uses multiple fields together instead of only one field.
// A unique compound index means the combination of user + name + type must be unique.
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

// This prevents one user from creating duplicate category names for the same type.
// Example: the same user cannot have two "Food" expense categories.
// But "Food" expense and "Food" income are allowed because the type is different.
// Another user can also have their own "Food" category because the user field is different.

// In index definitions, 1 means MongoDB stores that field in ascending order.
// The order helps MongoDB search and sort efficiently instead of scanning every category.

// Create the Category model from the schema so the app can create and query categories.
const Category = mongoose.model("Category", categorySchema);

// Export the model so controllers and routes can import it later.
export default Category;
