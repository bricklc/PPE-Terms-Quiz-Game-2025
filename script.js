let questions = [];
let currentQuestionIndex = 0;
let mode = "practice";
let order = "ordered";
let selectedQuiz = "";
let answeredCount = 0;
let queue = [];
let recallQueue = [];
let wrongAttempt = false;
let repeatCount = 0;
let repeatsEnabled = false;
let activeRecallEnabled = false;
let maxRepeats = 1;
let completedCount = 0; // Track completed questions

// New variables for quiz statistics and speed run
let quizStartTime = null;
let quizEndTime = null;
let correctCount = 0;
let speedRunTimer = null;
let speedRunEnabled = false;

const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");

// Utility function to shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

// Wait for DOM to load before adding event listeners
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[name="mode"]').forEach((input) =>
    input.addEventListener("change", (e) => {
      mode = e.target.value;
      document.getElementById("startButton").textContent = `Start ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    })
  );

  document.querySelectorAll('input[name="order"]').forEach((input) =>
    input.addEventListener("change", (e) => (order = e.target.value))
  );

  const repeatsEnabledInput = document.getElementById("repeatsEnabled");
  if (repeatsEnabledInput) {
    repeatsEnabledInput.addEventListener("change", (e) => {
      repeatsEnabled = e.target.checked;
      maxRepeats = repeatsEnabled ? parseInt(document.getElementById("maxRepeatsInput").value) || 1 : 0;
    });
  }

  const maxRepeatsInput = document.getElementById("maxRepeatsInput");
  if (maxRepeatsInput) {
    maxRepeatsInput.addEventListener("change", (e) => {
      maxRepeats = repeatsEnabled ? parseInt(e.target.value) || 1 : 0;
      if (maxRepeats > 5) maxRepeats = 5;
      if (maxRepeats < 0) maxRepeats = 0;
    });
  }

  const activeRecallEnabledInput = document.getElementById("activeRecallEnabled");
  if (activeRecallEnabledInput) {
    activeRecallEnabledInput.addEventListener("change", (e) => {
      activeRecallEnabled = e.target.checked;
    });
  }

  const speedRunEnabledInput = document.getElementById("speedRunEnabled");
  if (speedRunEnabledInput) {
    speedRunEnabledInput.addEventListener("change", (e) => {
      speedRunEnabled = e.target.checked;
    });
  }

  document.getElementById("startButton").addEventListener("click", startGame);
  document.getElementById("quitButton").addEventListener("click", resetGame);
  document.getElementById("infoButton").addEventListener("click", showQuote);
  document.getElementById("skipButton").addEventListener("click", skipQuestion);
  document.getElementById("creditsButton").addEventListener("click", toggleCredits);
  document.getElementById("prevButton").addEventListener("click", prevQuestion);
  document.getElementById("nextButton").addEventListener("click", nextQuestion);
  document.getElementById("closeQuote").addEventListener("click", hideQuote);

  // Event listener for ending the quiz early
  const endEarlyButton = document.getElementById("endEarlyButton");
  if (endEarlyButton) {
    endEarlyButton.addEventListener("click", endQuizEarly);
  }

  // Event listener for See Quiz Data button
  document.getElementById("seeQuizDataButton").addEventListener("click", showQuizData);

  // Event listener for Close Chart button
  document.getElementById("closeChart").addEventListener("click", () => {
    document.getElementById("chart-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
  });

  // Set last updated date on page load
  const lastUpdated = document.getElementById("last-updated");
  if (lastUpdated) {
    lastUpdated.textContent = `Last Updated: ${__BUILD_DATE__ || 'Unknown Date'}`;
  }
});

async function loadQuizFiles() {
  try {
    const response = await fetch("/.netlify/functions/getQuizFiles");
    if (!response.ok) throw new Error("Failed to load quiz files");
    const quizFiles = await response.json();
    const select = document.getElementById("quizSelect");
    quizFiles.forEach((file) => {
      const option = document.createElement("option");
      option.value = file;
      option.textContent = file.replace(".json", "");
      select.appendChild(option);
    });
    select.addEventListener("change", (e) => (selectedQuiz = e.target.value));
  } catch (error) {
    console.error("Error loading quiz files:", error);
    alert("Could not load quiz files.");
  }
}

async function startGame() {
  if (!selectedQuiz) return alert("Please select a quiz!");
  repeatsEnabled = document.getElementById("repeatsEnabled")?.checked || false;
  activeRecallEnabled = document.getElementById("activeRecallEnabled")?.checked || false;
  maxRepeats = repeatsEnabled ? parseInt(document.getElementById("maxRepeatsInput")?.value) || 1 : 0;
  if (mode === "learn") {
    repeatsEnabled = false;
    activeRecallEnabled = false;
    maxRepeats = 0;
  }
  try {
    const response = await fetch(`/.netlify/functions/getQuestions?quiz_file=${encodeURIComponent(selectedQuiz)}`);
    if (!response.ok) throw new Error("Failed to load questions");
    questions = await response.json();
    queue = [...questions];
    recallQueue = [];
    completedCount = 0;
    if (order === "random") shuffle(queue);
    repeatCount = 0;
    currentQuestionIndex = 0;
    
    // Initialize quiz statistics for quiz mode
    if (mode === "quiz") {
      quizStartTime = new Date();
      correctCount = 0;
      answeredCount = 0;
      // Start Speed Run timer if enabled
      if (document.getElementById("speedRunEnabled").checked) {
        let timeStr = document.getElementById("speedRunTimeInput").value.toLowerCase().trim();
        let timeLimitMs = 0;
        if (timeStr.includes("min")) {
          let num = parseInt(timeStr);
          timeLimitMs = num * 60000;
        } else if (timeStr.includes("s")) {
          let num = parseInt(timeStr);
          timeLimitMs = num * 1000;
        }
        if (timeLimitMs > 0) {
          speedRunTimer = setTimeout(() => { endQuizEarly(); }, timeLimitMs);
        }
      }
    }
    
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("chart-screen").classList.add("hidden");
    // Show End Quiz Early button only in Quiz Mode
    document.getElementById("endEarlyButton").style.display = (mode === "quiz") ? "block" : "none";
    loadQuestion();
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Could not load questions.");
  }
}

function loadQuestion() {
  if (queue.length === 0) {
    if (recallQueue.length > 0 && activeRecallEnabled) {
      queue = [...recallQueue];
      recallQueue = [];
      currentQuestionIndex = 0;
    } else {
      return endGame();
    }
  }
  const q = queue[currentQuestionIndex];
  document.getElementById("question").innerHTML = q.question;
  if (mode === "learn") {
    document.getElementById("choices").innerHTML = ""; // Hide choices
    document.getElementById("answer").innerHTML = q.answer; // Show only answer
    document.getElementById("answer").classList.remove("hidden");
    document.getElementById("navigation").classList.remove("hidden"); // Show arrows
    document.getElementById("skipButton").classList.add("hidden");
    document.getElementById("feedback").classList.add("hidden"); // Hide feedback
    // Update progress based on current question position in Learn mode
    document.getElementById("progress").textContent = `${currentQuestionIndex + 1}/${questions.length}`;
  } else { // Practice or Quiz
    document.getElementById("answer").classList.add("hidden");
    document.getElementById("navigation").classList.add("hidden"); // Hide arrows
    document.getElementById("skipButton").classList.remove("hidden");
    document.getElementById("feedback").classList.remove("hidden");
    const choicesContainer = document.getElementById("choices");
    choicesContainer.innerHTML = "";
    const shuffledChoices = [...q.choices];
    shuffle(shuffledChoices);
    shuffledChoices.forEach((choice) => {
      const button = document.createElement("button");
      button.innerHTML = choice;
      button.onclick = () => checkAnswer(button, choice, q.answer);
      choicesContainer.appendChild(button);
    });
    // Update progress based on completed count
    document.getElementById("progress").textContent = `${completedCount + 1}/${questions.length}`;
  }
}

function checkAnswer(button, choice, correctAnswer) {
  const feedback = document.getElementById("feedback");
  const currentQuestion = queue[currentQuestionIndex];
  if (choice === correctAnswer) {
    button.classList.add("correct");
    correctSound.play();
    feedback.textContent = "Correct! 🥳🎉";
    if (mode === "quiz") {
      correctCount++;  // Increment correct answer count
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    } else if (mode === "practice") {
      if (!repeatsEnabled) {
        answeredCount++;
        setTimeout(nextQuestion, 500);
      } else if (repeatsEnabled) {
        if (!wrongAttempt) {
          answeredCount++;
          if (repeatCount < maxRepeats) {
            repeatCount++;
            setTimeout(resetQuestion, 500);
          } else {
            setTimeout(nextQuestion, 500);
          }
        } else {
          if (repeatCount < maxRepeats) {
            repeatCount++;
            setTimeout(resetQuestion, 500);
          } else {
            answeredCount++;
            setTimeout(nextQuestion, 500);
          }
        }
      }
    }
  } else {
    button.classList.add("wrong");
    incorrectSound.play();
    // If in quiz mode and user has enabled reveal option, show the correct answer
    if (mode === "quiz" && document.getElementById("revealCorrectAnswer").checked) {
      feedback.textContent = `Wrong! 😣💥 Correct Answer: ${correctAnswer}`;
    } else {
      feedback.textContent = "Wrong! 😣💥";
    }
    wrongAttempt = true;
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    }
  }
}

function prevQuestion() {
  if (mode === "learn" && currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function nextQuestion() {
  if (mode === "learn" && currentQuestionIndex < queue.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
  } else if (queue.length > 0) {
    completedCount++; // Increment for Practice/Quiz
    queue.splice(currentQuestionIndex, 1);
    currentQuestionIndex = 0;
  }
  wrongAttempt = false;
  repeatCount = 0;
  loadQuestion();
}

function skipQuestion() {
  const skipped = queue.splice(currentQuestionIndex, 1)[0];
  queue.push(skipped); // Move skipped question to the end
  completedCount++; // Increment for skip
  wrongAttempt = false;
  repeatCount = 0;
  loadQuestion();
}

function resetQuestion() {
  loadQuestion();
}

function endGame() {
  if (speedRunTimer) {
    clearTimeout(speedRunTimer);
    speedRunTimer = null;
  }
  if (mode === "quiz") {
    quizEndTime = new Date();
    let timeTakenSec = Math.round((quizEndTime - quizStartTime) / 1000);
    let accuracy = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(2) : 0;
    let statsHTML = `<br><br><strong>Time Started:</strong> ${quizStartTime.toLocaleTimeString()}<br>
                     <strong>Time Ended:</strong> ${quizEndTime.toLocaleTimeString()}<br>
                     <strong>Score:</strong> ${correctCount} / ${answeredCount}<br>
                     <strong>Accuracy:</strong> ${accuracy}%<br>
                     <strong>Time Taken:</strong> ${timeTakenSec} seconds`;
    document.getElementById("question").innerHTML = "Game Over!" + statsHTML;
    // Store accuracy in localStorage when quiz is fully completed
    let quizData = JSON.parse(localStorage.getItem("quizData_" + selectedQuiz)) || [];
    quizData.push(parseFloat(accuracy));
    localStorage.setItem("quizData_" + selectedQuiz, JSON.stringify(quizData));
  } else {
    document.getElementById("question").textContent = "Game Over!";
  }
  document.getElementById("choices").innerHTML = "";
  document.getElementById("answer").classList.add("hidden");
  document.getElementById("navigation").classList.add("hidden");
  document.getElementById("skipButton").classList.add("hidden");
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("quoteDisplay").classList.add("hidden");
}

// New function to end the quiz early (also used by Speed Run timer)
function endQuizEarly() {
  if (speedRunTimer) {
    clearTimeout(speedRunTimer);
    speedRunTimer = null;
  }
  if (mode === "quiz") {
    quizEndTime = new Date();
    let timeTakenSec = Math.round((quizEndTime - quizStartTime) / 1000);
    let accuracy = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(2) : 0;
    let statsHTML = `<br><br><strong>Time Started:</strong> ${quizStartTime.toLocaleTimeString()}<br>
                     <strong>Time Ended:</strong> ${quizEndTime.toLocaleTimeString()}<br>
                     <strong>Score:</strong> ${correctCount} / ${answeredCount}<br>
                     <strong>Accuracy:</strong> ${accuracy}%<br>
                     <strong>Time Taken:</strong> ${timeTakenSec} seconds`;
    document.getElementById("question").innerHTML = "Quiz Ended Early!" + statsHTML;
  } else {
    document.getElementById("question").textContent = "Quiz Ended Early!";
  }
  document.getElementById("choices").innerHTML = "";
  document.getElementById("answer").classList.add("hidden");
  document.getElementById("navigation").classList.add("hidden");
  document.getElementById("skipButton").classList.add("hidden");
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("quoteDisplay").classList.add("hidden");
}

function resetGame() {
  if (speedRunTimer) {
    clearTimeout(speedRunTimer);
    speedRunTimer = null;
  }
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  document.getElementById("chart-screen").classList.add("hidden");
  questions = [];
  queue = [];
  recallQueue = [];
  answeredCount = 0;
  currentQuestionIndex = 0;
  wrongAttempt = false;
  repeatCount = 0;
  completedCount = 0;
  document.getElementById("quoteDisplay").classList.add("hidden");
}

async function showQuote() {
  const quoteDisplay = document.getElementById("quoteDisplay");
  const quoteText = document.getElementById("quoteText");
  try {
    // Fetch quotes from quotes.json
    const response = await fetch("/.netlify/functions/getQuestions?quiz_file=quotes.json");
    if (!response.ok) throw new Error("Failed to load quotes");
    const quotes = await response.json();
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteText.textContent = randomQuote;
    quoteDisplay.classList.remove("hidden");
  } catch (error) {
    console.error("Error loading quotes:", error);
    quoteText.textContent = "Keep pushing forward!";
    quoteDisplay.classList.remove("hidden");
  }
}

function hideQuote() {
  const quoteDisplay = document.getElementById("quoteDisplay");
  quoteDisplay.classList.add("hidden");
}

function toggleCredits() {
  const creditsMessage = document.getElementById("creditsMessage");
  creditsMessage.style.display = creditsMessage.style.display === "none" || !creditsMessage.style.display ? "block" : "none";
}

// New function to display quiz accuracy graph
function showQuizData() {
  if (!selectedQuiz) {
    alert("Please select a quiz first.");
    return;
  }

  let quizData = JSON.parse(localStorage.getItem("quizData_" + selectedQuiz)) || [];
  if (quizData.length === 0) {
    alert("No quiz data available yet.");
    return;
  }

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("chart-screen").classList.remove("hidden");

  let ctx = document.getElementById("accuracyChart").getContext("2d");

  // Destroy previous chart if it exists to prevent overlap
  if (window.accuracyChart) {
    window.accuracyChart.destroy();
  }

  let labels = quizData.map((_, index) => index + 1); // Attempt numbers (1, 2, 3, ...)
  let data = {
    labels: labels,
    datasets: [{
      label: "Accuracy (%)",
      data: quizData,
      borderColor: "rgba(75, 192, 192, 1)",
      backgroundColor: "rgba(75, 192, 192, 0.2)",
      fill: true,
    }]
  };

  window.accuracyChart = new Chart(ctx, {
    type: "line",
    data: data,
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

window.onload = loadQuizFiles;