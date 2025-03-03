let questions = [];
let currentQuestionIndex = 0;
let mode = "practice"; // Default mode
let order = "ordered"; // Default order
let selectedQuiz = "";
let answeredCount = 0;
let queue = [];
let wrongAttempt = false; // Tracks wrong attempts for the current question

// Audio elements
const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");

// Mode and order selection
document.querySelectorAll('input[name="mode"]').forEach((input) =>
  input.addEventListener("change", (e) => {
    mode = e.target.value;
    document.getElementById("startButton").textContent = `Start ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  })
);

document.querySelectorAll('input[name="order"]').forEach((input) =>
  input.addEventListener("change", (e) => (order = e.target.value))
);

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("quitButton").addEventListener("click", resetGame);
document.getElementById("infoButton").addEventListener("click", showQuote);
document.getElementById("skipButton").addEventListener("click", skipQuestion);

// Load available quiz files
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
    alert("Could not load quiz files. Please check your connection or server setup.");
  }
}

// Start the game
async function startGame() {
  if (!selectedQuiz) return alert("Please select a quiz!");
  try {
    const response = await fetch(`/.netlify/functions/getQuestions?quiz_file=${encodeURIComponent(selectedQuiz)}`);
    if (!response.ok) throw new Error("Failed to load questions");
    questions = await response.json();
    queue = [...questions];
    if (order === "random") queue.sort(() => Math.random() - 0.5);
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    loadQuestion();
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Could not load questions. Ensure the quiz file exists.");
  }
}

// Load the current question
function loadQuestion() {
  if (queue.length === 0) return endGame();
  const q = queue[currentQuestionIndex];
  document.getElementById("question").textContent = q.question;
  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  q.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice;
    button.onclick = () => checkAnswer(button, choice, q.answer);
    choicesContainer.appendChild(button);
  });
  document.getElementById("progress").textContent = `${answeredCount}/${questions.length}`;
  document.getElementById("feedback").textContent = "";
  wrongAttempt = false; // Reset for each new question
}

// Check user’s answer
function checkAnswer(button, choice, correctAnswer) {
  const feedback = document.getElementById("feedback");
  if (choice === correctAnswer) {
    button.classList.add("correct");
    correctSound.play(); // Play sound for correct answer
    feedback.textContent = "Correct! 🥳🎉";
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    } else if (mode === "practice") {
      if (!wrongAttempt) {
        answeredCount++; // Increment only on first correct attempt
        setTimeout(nextQuestion, 500);
      } else {
        setTimeout(resetQuestion, 500); // Loop for another first attempt
      }
    }
  } else {
    button.classList.add("wrong");
    incorrectSound.play(); // Play sound for incorrect answer
    feedback.textContent = "Wrong! 😣💥";
    wrongAttempt = true; // Mark wrong attempt
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    }
    // In practice mode, question persists until correct
  }
}

// Skip current question
function skipQuestion() {
  const skipped = queue.splice(currentQuestionIndex, 1)[0];
  queue.push(skipped);
  wrongAttempt = false; // Reset tracking
  loadQuestion();
}

// Move to next question
function nextQuestion() {
  queue.splice(currentQuestionIndex, 1);
  currentQuestionIndex = 0;
  wrongAttempt = false;
  loadQuestion();
}

// Reset current question for another attempt
function resetQuestion() {
  loadQuestion();
}

// End the game
function endGame() {
  document.getElementById("question").textContent = "Game Over!";
  document.getElementById("choices").innerHTML = "";
  document.getElementById("skipButton").classList.add("hidden");
}

// Reset to start screen
function resetGame() {
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  questions = [];
  queue = [];
  answeredCount = 0;
  currentQuestionIndex = 0;
  wrongAttempt = false;
}

// Show a random quote
async function showQuote() {
  try {
    const response = await fetch("/.netlify/functions/getQuestions?quiz_file=quotes.json");
    if (!response.ok) throw new Error("Failed to load quotes");
    const quotes = await response.json();
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    alert(randomQuote);
  } catch (error) {
    console.error("Error loading quotes:", error);
    alert("Keep pushing forward!");
  }
}

window.onload = loadQuizFiles;