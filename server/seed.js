// Import dotenv so this script can read MONGO_URI from .env.
import dotenv from "dotenv";

// Import mongoose so this script can connect to MongoDB and create ObjectId values.
import mongoose from "mongoose";

// Import the Category and SubCategory models so this script can delete and create documents.
import Category from "./models/Category.js";
import SubCategory from "./models/SubCategory.js";

// Import the default category and subcategory list used by the app.
import { DEFAULT_CATEGORIES, FOOD_SUBCATEGORIES } from "./utils/constants.js";

// Load environment variables before using process.env.MONGO_URI.
dotenv.config();

// Seeding means inserting starter data into the database.
// You run a seed script during initial setup or after a database reset.
const seedDefaultCategories = async () => {
  try {
    // Connect directly to MongoDB for this one-time script.
    await mongoose.connect(process.env.MONGO_URI);

    // Delete existing defaults first so the script is idempotent.
    // Idempotent means it is safe to run multiple times and still ends with the same result.
    await Category.deleteMany({ isDefault: true });

    // Default categories still require a user field because the Category schema requires it.
    // This dummy ObjectId is only a placeholder; default categories are found by isDefault: true.
    const defaultUserId = new mongoose.Types.ObjectId();

    const categoriesToCreate = [];

    // Loop through expense and income arrays and convert each item into a Category document shape.
    Object.entries(DEFAULT_CATEGORIES).forEach(([type, categories]) => {
      categories.forEach((category) => {
        categoriesToCreate.push({
          user: defaultUserId,
          name: category.name,
          type,
          icon: category.icon,
          isDefault: true,
        });
      });
    });

    // Insert all default categories in one database call.
    const createdCategories = await Category.insertMany(categoriesToCreate);

    console.log(`Seeded ${createdCategories.length} default categories`);

    // Seed default subcategories
    await SubCategory.deleteMany({ isDefault: true });

    const subCategoriesToCreate = FOOD_SUBCATEGORIES.map((sub) => ({
      parentCategory: "Food",
      name: sub.name,
      icon: sub.icon,
      isDefault: true,
      user: null,
    }));

    const createdSubCategories = await SubCategory.insertMany(subCategoriesToCreate);
    console.log(`Seeded ${createdSubCategories.length} default food subcategories`);
  } catch (error) {
    // Print any error so setup problems are easy to debug.
    console.error(error);
    process.exitCode = 1;
  } finally {
    // Always disconnect so the Node process can exit cleanly.
    await mongoose.disconnect();
  }
};

// Run the seed function.
seedDefaultCategories();
