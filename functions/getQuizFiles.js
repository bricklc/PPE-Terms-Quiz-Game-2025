const fs = require("fs").promises;
const path = require("path");

exports.handler = async () => {
  try {
    const dataDir = path.join(__dirname, "data"); // Now points to functions/data/
    const files = await fs.readdir(dataDir);
    const quizFiles = files.filter((file) => file.endsWith(".json") && file !== "quotes.json");
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