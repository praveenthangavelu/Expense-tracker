// Import mongoose so this file can open a connection to MongoDB.
import mongoose from "mongoose";

// Export connectDB so server.js can call it before starting the API server.
export const connectDB = async () => {
  try {
    // Connection pool tuning for production-grade performance:
    //   maxPoolSize  — max concurrent connections to MongoDB (default 5 is too low under load)
    //   minPoolSize  — keeps 2 connections warm so the first request isn't cold
    //   socketTimeoutMS — close idle sockets after 45s to free server resources
    //   serverSelectionTimeoutMS — fail fast (5s) if MongoDB is unreachable, instead of hanging
    //   heartbeatFrequencyMS — how often Mongoose pings the server to detect disconnects
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });

    // Show the connected database host so you know the connection worked.
    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);

    // Log pool lifecycle events in development so connection issues are visible.
    if (process.env.NODE_ENV === "development") {
      mongoose.connection.on("disconnected", () =>
        console.warn("⚠️  MongoDB disconnected")
      );
      mongoose.connection.on("error", (err) =>
        console.error("❌ MongoDB error:", err.message)
      );
    }
  } catch (error) {
    // Print the connection error so you can debug invalid URLs or network issues.
    console.error("❌ MongoDB connection failed:", error.message);

    // Stop the app because it should not run without a database connection.
    process.exit(1);
  }
};
