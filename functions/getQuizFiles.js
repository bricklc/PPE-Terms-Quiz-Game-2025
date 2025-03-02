const fs = require("fs").promises;
const path = require("path");

exports.handler = async () => {
  try {
    // Ensure correct function directory for Netlify
    const basePath = process.env.LAMBDA_TASK_ROOT || __dirname;
    const dataDir = path.join(basePath, "data"); // Ensure it looks inside functions/data/

    console.log("Attempting to read directory:", dataDir); // Debugging log

    // Read quiz files in the data directory
    const files = await fs.readdir(dataDir);
    console.log("Found files:", files); // Debugging log

    // Filter only JSON quiz files (excluding quotes.json)
    const quizFiles = files
      .filter((file) => file.endsWith(".json") && file.toLowerCase() !== "quotes.json")
      .map((file) => file.toLowerCase()); // Convert all filenames to lowercase to prevent case issues

    return {
      statusCode: 200,
      body: JSON.stringify(quizFiles),
    };
  } catch (error) {
    console.error("Error reading data directory:", error); // Log exact error to Netlify logs
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load quiz files" }),
    };
  }
};
