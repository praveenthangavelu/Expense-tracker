// Import mongoose so this file can open a connection to MongoDB.
import mongoose from "mongoose";

// Export connectDB so server.js can call it before starting the API server.
export const connectDB = async () => {
  try {
    // Use the MongoDB connection string stored in the .env file.
    const connection = await mongoose.connect(process.env.MONGO_URI);

    // Show the connected database host so you know the connection worked.
    console.log(`MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    // Print the connection error so you can debug invalid URLs or network issues.
    console.error(error);

    // Stop the app because it should not run without a database connection.
    process.exit(1);
  }
};
