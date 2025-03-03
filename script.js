let questions = [];
let currentQuestionIndex = 0;
let mode = "practice";
let order = "ordered";
let selectedQuiz = "";
let answeredCount = 0;
let queue = [];
let wrongAttempt = false;
let repeatCount = 0; // Track number of repeat cycles
const maxRepeats = 2; // Set maximum repeats

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
document.getElementById("creditsButton").addEventListener("click", toggleCredits);

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
  try {
    const response = await fetch(`/.netlify/functions/getQuestions?quiz_file=${encodeURIComponent(selectedQuiz)}`);
    if (!response.ok) throw new Error("Failed to load questions");
    questions = await response.json();
    queue = [...questions];
    if (order === "random") queue.sort(() => Math.random() - 0.5);
    repeatCount = 0; // Reset repeat count
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    loadQuestion();
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Could not load questions.");
  }
}

function loadQuestion() {
  if (queue.length === 0) return endGame();
  const q = queue[currentQuestionIndex];
  document.getElementById("question").textContent = q.question;
  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = "";
  // Create a copy of choices and shuffle it
  const shuffledChoices = [...q.choices]; // Copy to avoid modifying original
  shuffle(shuffledChoices);
  shuffledChoices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice;
    button.onclick = () => checkAnswer(button, choice, q.answer);
    choicesContainer.appendChild(button);
  });
  document.getElementById("progress").textContent = `${answeredCount}/${questions.length}`;
  document.getElementById("feedback").textContent = "";
  wrongAttempt = false; // Reset for new question
}

function checkAnswer(button, choice, correctAnswer) {
  const feedback = document.getElementById("feedback");
  if (choice === correctAnswer) {
    button.classList.add("correct");
    correctSound.play();
    feedback.textContent = "Correct! 🥳🎉";
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    } else if (mode === "practice") {
      if (!wrongAttempt) {
        answeredCount++; // First correct attempt
        if (repeatCount < maxRepeats) {
          repeatCount++; // Start repeat cycle
          setTimeout(resetQuestion, 500); // Repeat for practice
        } else {
          setTimeout(nextQuestion, 500); // Move on after max repeats
        }
      } else {
        // Correct after wrong attempt, reset if wrong occurred
        repeatCount = 0; // Back to square one
        wrongAttempt = false; // Reset for new cycle
        setTimeout(resetQuestion, 500); // Repeat to start fresh
      }
    }
  } else {
    button.classList.add("wrong");
    incorrectSound.play();
    feedback.textContent = "Wrong! 😣💥";
    wrongAttempt = true;
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    }
    // Practice mode persists, resets cycle on wrong
  }
}

function skipQuestion() {
  const skipped = queue.splice(currentQuestionIndex, 1)[0];
  queue.push(skipped);
  wrongAttempt = false;
  repeatCount = 0; // Reset on skip
  loadQuestion();
}

function nextQuestion() {
  queue.splice(currentQuestionIndex, 1);
  currentQuestionIndex = 0;
  wrongAttempt = false;
  repeatCount = 0; // Reset on next
  loadQuestion();
}

function resetQuestion() {
  loadQuestion();
}

function endGame() {
  document.getElementById("question").textContent = "Game Over!";
  document.getElementById("choices").innerHTML = "";
  document.getElementById("skipButton").classList.add("hidden");
}

function resetGame() {
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
  questions = [];
  queue = [];
  answeredCount = 0;
  currentQuestionIndex = 0;
  wrongAttempt = false;
  repeatCount = 0;
}

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

function toggleCredits() {
  const creditsMessage = document.getElementById("creditsMessage");
  creditsMessage.style.display = creditsMessage.style.display === "none" || !creditsMessage.style.display ? "block" : "none";
}

window.onload = loadQuizFiles;