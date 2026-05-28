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

    console.log("Fetching Gmail messages directly...");
    // Let's fetch the list of messages with no filters
    const listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15";
    const runReq = async (accessToken) => {
      return fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    };

    let response = await runReq(user.googleAuth.accessToken);
    if (response.status === 401) {
      console.log("Refreshing tokens...");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: user.googleAuth.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (refreshRes.ok) {
        const tokens = await refreshRes.json();
        user.googleAuth.accessToken = tokens.access_token;
        await user.save();
        response = await runReq(tokens.access_token);
      }
    }

    if (!response.ok) {
      console.log("Gmail request failed:", await response.text());
      process.exit(1);
    }

    const data = await response.json();
    console.log(`Found ${data.messages?.length || 0} total messages.`);

    const messages = data.messages || [];
    for (const msg of messages) {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${user.googleAuth.accessToken}` },
      });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const headers = msgData.payload.headers || [];
        const sender = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
        const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
        const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "";
        const labelIds = msgData.labelIds || [];
        console.log(`- ID: ${msg.id} | From: ${sender} | Subject: ${subject} | Date: ${date} | Labels: ${labelIds.join(", ")}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
