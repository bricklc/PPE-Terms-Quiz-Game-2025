const fs = require("fs").promises;
const path = require("path");

exports.handler = async () => {
  try {
    const basePath = path.join(process.env.LAMBDA_TASK_ROOT || __dirname, "functions");
    console.log("Base path resolved to:", basePath);
    const dataDir = path.join(basePath, "data");
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