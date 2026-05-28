import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import { scanEmails } from "./services/emailScanner.js";
import ImportedTransaction from "./models/ImportedTransaction.js";

dotenv.config();

const runTest = async () => {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.");

    // Find first user or create a test user
    let user = await User.findOne({});
    if (!user) {
      console.log("No user found in database. Creating test user...");
      user = await User.create({
        name: "Test User",
        email: "testuser@gmail.com",
        password: "password123",
        googleAuth: {
          isConnected: true,
          accessToken: "simulator_access_token",
          refreshToken: "simulator_refresh_token",
          lastScanAt: null,
          email: "simulator@gmail.com",
        },
      });
      console.log("Test user created:", user._id);
    } else {
      console.log("Found existing user to run test scans on:", user.email);
      // Ensure connected for scanner
      user.googleAuth.isConnected = true;
      user.googleAuth.refreshToken = "simulator_refresh_token";
      await user.save();
    }

    // Clean old simulator transactions for a fresh test run
    await ImportedTransaction.deleteMany({ user: user._id, emailId: { $regex: /^sim_/ } });

    console.log("Triggering email scan simulator...");
    const result = await scanEmails(user._id, 7);
    
    console.log("\n================ TEST RESULTS ================");
    console.log(`Total Emails Scanned:   ${result.totalEmailsScanned}`);
    console.log(`Transactions Detected:  ${result.transactionsDetected}`);
    console.log(`Drafts Created:         ${result.draftsCreated}`);
    console.log(`Duplicates Skipped:     ${result.duplicatesSkipped}`);
    console.log(`Breakdown:              Income: ${result.breakdown.income}, Expense: ${result.breakdown.expense}`);
    
    const drafts = await ImportedTransaction.find({ user: user._id, emailId: { $regex: /^sim_/ } });
    console.log("\nCreated Drafts Details:");
    drafts.forEach(d => {
      console.log(`- [${d.source}] ${d.merchant} - ${d.type === 'income' ? '+' : '-'}₹${d.amount} (${d.category}) | Confidence: ${d.confidence}%`);
    });
    console.log("==============================================");

    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err.message);
    process.exit(1);
  }
};

runTest();
