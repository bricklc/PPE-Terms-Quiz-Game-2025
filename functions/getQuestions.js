const fs = require("fs").promises;
const path = require("path");

exports.handler = async (event) => {
  const quizFile = event.queryStringParameters.quiz_file;
  if (!quizFile) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing quiz_file parameter" }),
    };
  }
  try {
    const filePath = path.join(__dirname, "../data", quizFile);
    const data = await fs.readFile(filePath, "utf8");
    return {
      statusCode: 200,
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load questions" }),
    };
  }
};