const fs = require("fs").promises;
const path = require("path");

exports.handler = async () => {
  try {
    const dataDir = path.join(__dirname, "../data"); // Points to data/ relative to functions/
    const files = await fs.readdir(dataDir);
    const quizFiles = files.filter((file) => file.endsWith(".json") && file !== "quotes.json");
    return {
      statusCode: 200,
      body: JSON.stringify(quizFiles), // Should return ["CNS_PIPE_01.json", "CNS_PIPE_02.json"]
    };
  } catch (error) {
    console.error("Error reading data directory:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load quiz files" }),
    };
  }
};