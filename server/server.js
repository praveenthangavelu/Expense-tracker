// Import dotenv so environment variables from .env can be loaded.
import dotenv from "dotenv";

// Import the database connection function from our config folder.
import { connectDB } from "./config/db.js";

// Load the variables from .env into process.env before other app code runs.
dotenv.config();

// Import the Express app after dotenv.config() so app.js can read process.env values.
const { default: app } = await import("./app.js");

// Import the recurring transactions background job
import { startRecurringJob } from "./jobs/recurringJob.js";

// Read the server port from .env, or use 5000 if PORT is missing.
const PORT = process.env.PORT || 5000;

// Connect to MongoDB first, then start accepting HTTP requests.
connectDB().then(() => {
  // Start the Express server on the configured port.
  app.listen(PORT, () => {
    // Log the running port so you know where the API is available.
    console.log(`Server running on port ${PORT}`);
  });

  // Start the recurring transactions cron-like hourly job.
  startRecurringJob();
});

// Listen for unhandled promise errors anywhere in the app.
process.on("unhandledRejection", (error) => {
  // Print the error so you can see what went wrong.
  console.error(error);

  // Exit the process because an unhandled async error can leave the app unstable.
  process.exit(1);
});
