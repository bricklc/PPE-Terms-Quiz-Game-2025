// set-build-date.js
const fs = require('fs');

const buildDate = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Manila', // Philippine Standard Time (UTC+8)
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short'
});

const logEntryTime = new Date().toISOString(); // ISO timestamp for log file
let indexContent = fs.readFileSync('index.html', 'utf8');

// Extract and remove the previous __BUILD_DATE__ script tag if it exists
let previousBuildDate = null;
const buildDateRegex = /<script>const __BUILD_DATE__ = "([^"]+)";<\/script>/;
const match = indexContent.match(buildDateRegex);
if (match) {
  previousBuildDate = match[0]; // e.g., <script>const __BUILD_DATE__ = "Tuesday, March 4, 2025 at 12:58:37 AM PST";</script>
  indexContent = indexContent.replace(buildDateRegex, ''); // Remove the old tag
  console.log('Found and removed previous build date:', previousBuildDate);
} else {
  console.log('No previous build date found in index.html');
}

// Append previous build date to build-date-logs.txt with a timestamp
if (previousBuildDate) {
  const logEntry = `[${logEntryTime}] Previous Build Date: ${previousBuildDate}\n`;
  fs.appendFileSync('build-date-logs.txt', logEntry, 'utf8');
  console.log(`Logged previous build date to build-date-logs.txt`);
} else {
  console.log('No previous build date to log');
}

// Inject the new build date
const scriptTagPosition = indexContent.indexOf('<script src="script.js"></script>');
if (scriptTagPosition !== -1) {
  const updatedContent = indexContent.slice(0, scriptTagPosition) +
    `<script>const __BUILD_DATE__ = "${buildDate}";</script>\n    ` +
    indexContent.slice(scriptTagPosition);
  fs.writeFileSync('index.html', updatedContent);
  console.log(`New build date injected: ${buildDate}`);
} else {
  console.error('Error: <script src="script.js"></script> not found in index.html');
}

console.log('Build date process completed');