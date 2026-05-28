import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const inspect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const users = await User.find({}, { name: 1, email: 1, googleAuth: 1 });
    console.log("Users in DB:", JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Inspection error:", err.message);
    process.exit(1);
  }
};

inspect();
