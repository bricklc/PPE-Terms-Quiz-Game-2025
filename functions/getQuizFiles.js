const fs = require("fs").promises;
const path = require("path");

exports.handler = async () => {
  try {
    const dataDir = path.join(__dirname, "data"); // Correct path: /var/task/data
    console.log("Attempting to read directory:", dataDir);

    const files = await fs.readdir(dataDir);
    console.log("Found files:", files);

    const quizFiles = files
      .filter((file) => file.endsWith(".json") && file.toLowerCase() !== "quotes.json")
      .map((file) => file.toLowerCase());

    return {
      statusCode: 200,
      body: JSON.stringify(quizFiles),
    };
  } catch (error) {
    console.error("Error reading data directory:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load quiz files" }),
    };
  }
};