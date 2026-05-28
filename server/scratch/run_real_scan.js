import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import { scanEmails } from "../services/emailScanner.js";

dotenv.config();

const run = async () => {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    // Find the user connected to Google
    const user = await User.findOne({ "googleAuth.isConnected": true });
    if (!user) {
      console.log("No connected Google user found in DB!");
      process.exit(1);
    }

    console.log(`Scanning emails for connected user: ${user.name} (${user.email}) | Google Email: ${user.googleAuth.email}`);
    
    // Let's run scanEmails and inspect details
    const result = await scanEmails(user._id, 7);
    console.log("Scan Result:", result);

    process.exit(0);
  } catch (err) {
    console.error("Scan error:", err);
    process.exit(1);
  }
};

run();
