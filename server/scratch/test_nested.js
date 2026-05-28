import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ "googleAuth.isConnected": true });
    if (!user) {
      console.log("No connected user!");
      process.exit(1);
    }

    const testQueries = [
      "label:inbox newer_than:7d subject:bill",
      "label:inbox newer_than:7d (subject:bill OR subject:invoice)",
      "label:inbox newer_than:7d (subject:bill OR subject:invoice OR subject:receipt OR subject:order OR subject:payment)",
      "label:inbox newer_than:7d (from:(amazon OR swiggy OR Zomato) OR subject:(order OR payment OR receipt OR bill OR invoice))",
      "label:inbox newer_than:7d (from:amazon OR from:swiggy OR from:Zomato OR subject:order OR subject:payment OR subject:receipt OR subject:bill OR subject:invoice)"
    ];

    for (const q of testQueries) {
      console.log(`\nTesting Query: "${q}"`);
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(q)}`;
      const res = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${user.googleAuth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`Matched ${data.messages?.length || 0} messages.`);
      } else {
        console.log("Failed:", await res.text());
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
