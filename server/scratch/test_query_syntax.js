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
      "label:inbox newer_than:7d",
      "label:inbox newer_than:7d (from:(amazon OR flipkart OR swiggy OR Zomato OR myntra OR uber OR ola OR netflix OR spotify OR airtel OR jio OR vodafone OR bescom OR tatapower OR bigbasket OR blinkit OR zepto OR makemytrip OR bookmyshow OR pharmeasy OR zerodha OR groww OR nobroker OR hdfc OR sbi OR icici OR axis OR kotak) OR subject:(order OR payment OR receipt OR invoice OR bill OR transaction OR debit OR credit OR salary OR transfer OR subscription OR recharge OR emi OR loan OR insurance OR premium OR sip OR mutual fund OR rent OR refund OR statement))"
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
        if (data.messages) {
          for (const m of data.messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
              headers: { Authorization: `Bearer ${user.googleAuth.accessToken}` },
            });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const subject = detail.payload.headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
              console.log(`- ID: ${m.id} | Subject: ${subject}`);
            }
          }
        }
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
