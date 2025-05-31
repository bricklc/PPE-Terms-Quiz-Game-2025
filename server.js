const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const port = 3000;

// Serve static files from root directory
app.use(express.static(__dirname));

// Endpoint to get quiz files (mimicking Netlify function)
app.get('/.netlify/functions/getQuizFiles', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'functions', 'data');
        const files = await fs.readdir(dataDir);
        const quizFiles = files
            .filter(file => file.endsWith('.json') && file.toLowerCase() !== 'quotes.json')
            .map(file => file.toLowerCase());
        res.json(quizFiles);
    } catch (error) {
        console.error('Error reading data directory:', error);
        res.status(500).json({ error: 'Failed to load quiz files' });
    }
});

// Endpoint to get questions (mimicking Netlify function)
app.get('/.netlify/functions/getQuestions', async (req, res) => {
    const quizFile = req.query.quiz_file;
    if (!quizFile) {
        return res.status(400).json({ error: 'Missing quiz_file parameter' });
    }
    try {
        const filePath = path.join(__dirname, 'functions', 'data', quizFile);
        const data = await fs.readFile(filePath, 'utf8');
        res.send(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load questions' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
