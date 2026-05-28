import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const resetUserGoogleAuth = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const result = await User.updateMany(
      {},
      {
        $set: {
          "googleAuth": {
            isConnected: false,
            accessToken: null,
            refreshToken: null,
            lastScanAt: null,
            email: null
          }
        }
      }
    );

    console.log(`Reset Google Auth for ${result.modifiedCount} user records.`);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting user:", err.message);
    process.exit(1);
  }
};

resetUserGoogleAuth();
