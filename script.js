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
let typingAnimationEnabled = false;

// Streak tracking variables
let currentStreak = 0;
let maxStreak = 0;

// New variables for quiz statistics and speed run
let quizStartTime = null;
let quizEndTime = null;
let correctCount = 0;
let speedRunTimer = null;
let speedRunEnabled = false;

const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");

// Theme management
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('.material-icons');

// Check for saved theme preference, otherwise use system preference
const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Apply theme to document
const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    localStorage.setItem('theme', theme);
};

// Initialize theme
let currentTheme = getPreferredTheme();
applyTheme(currentTheme);

// Theme toggle event listener
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        currentTheme = e.matches ? 'dark' : 'light';
        applyTheme(currentTheme);
    }
});

// Utility function to shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

// Track current typing animation
let currentTypingPromise = null;
let isTypingCanceled = false;

// Function to animate text typing
async function typeText(element, text) {
  // Cancel any ongoing animation
  if (currentTypingPromise) {
    isTypingCanceled = true;
    await currentTypingPromise;
  }

  isTypingCanceled = false;

  if (!typingAnimationEnabled) {
    element.textContent = text;
    element.classList.remove('typing-animation'); // Ensure class is removed
    return;
  }

  element.innerHTML = '<span></span>'; // Create a clean span for the animation
  element.classList.add('typing-animation');
  const textSpan = element.querySelector('span');

  // Fallback if the span isn't created, though this is unlikely here
  if (!textSpan) {
    element.textContent = text;
    element.classList.remove('typing-animation');
    return;
  }
  
  const words = text.split(' ');
  let animatedText = '';
  
  currentTypingPromise = (async () => {
    for (let i = 0; i < words.length; i++) {
      if (isTypingCanceled) break;
      // Build the text word by word, adding a space only between words
      animatedText += words[i] + (i < words.length - 1 ? ' ' : ''); 
      textSpan.textContent = animatedText;
      await new Promise(resolve => setTimeout(resolve, 150)); // Typing speed
    }
    
    if (isTypingCanceled) {
      // If canceled, set the full text on the parent element directly
      element.textContent = text;
    } else {
      // If animation completed normally, ensure the span has the exact final text
      textSpan.textContent = text;
    }
    // Always remove the animation class to stop cursor/effects
    element.classList.remove('typing-animation');
  })();

  await currentTypingPromise;
  currentTypingPromise = null; // Reset for the next animation
}

// Loading screen animation sequence
document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.querySelector('#loading-screen');
    const progressBarFill = document.querySelector('#progress-bar-fill');

    // Simulate progress bar loading
    let progress = 0;
    const progressBarPromise = new Promise(async (resolve) => {
        // Initial fast fill
        let initialFillTarget = Math.random() * 20 + 20; // 20% to 40%
        progress = initialFillTarget;
        progressBarFill.style.width = `${progress}%`;
        
        // Random pause
        const pauseDuration = Math.random() * 900 + 300; // 300ms to 1200ms
        await new Promise(res => setTimeout(res, pauseDuration));
        
        // Fill to 100%
        progress = 100;
        progressBarFill.style.width = `${progress}%`;
        // Wait for the width transition to complete (0.3s as defined in CSS)
        await new Promise(res => setTimeout(res, 300)); 
        resolve();
    });

    // Wait for progress bar to complete
    await progressBarPromise;

    // The fade-out should start after the progress bar is complete, plus a small buffer.
    setTimeout(() => {
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); // Corresponds to opacity transition duration
    }, 250); // Additional small delay after progress bar finishes
});

const loadingScreenStartTime = performance.now(); // For timing calculations

// Wait for DOM to load before adding event listeners
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[name="mode"]').forEach((input) =>
    input.addEventListener("change", (e) => {
      mode = e.target.value;
      document.getElementById("startButton").textContent = `Start ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
      
      // Show/hide Auto Play container based on Learn Mode selection
      const autoPlayContainer = document.getElementById('autoPlayContainer');
      if (mode === 'learn') {
        autoPlayContainer.style.display = 'block';
      } else {
        autoPlayContainer.style.display = 'none';
        // Ensure autoPlay is off if not in learn mode
        if (isAutoPlaying) {
          toggleAutoPlay(); 
        }
        document.getElementById('autoPlayEnabled').checked = false;
        document.getElementById('autoPlaySliderContainer').style.display = 'none';
      }
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

  const typingAnimationInput = document.getElementById("typingAnimationEnabled");
  if (typingAnimationInput) {
    typingAnimationInput.addEventListener("change", (e) => {
      typingAnimationEnabled = e.target.checked;
    });
  }

  // Auto Play checkbox listener
  const autoPlayEnabledCheckbox = document.getElementById('autoPlayEnabled');
  const autoPlaySliderContainer = document.getElementById('autoPlaySliderContainer');
  if (autoPlayEnabledCheckbox) {
    autoPlayEnabledCheckbox.addEventListener('change', (e) => {
      autoPlayEnabled = e.target.checked;
      if (autoPlayEnabled) {
        autoPlaySliderContainer.style.display = 'block';
      } else {
        autoPlaySliderContainer.style.display = 'none';
        if (isAutoPlaying) {
          toggleAutoPlay(); // Stop auto-play if checkbox is unchecked
        }
      }
    });
  }

  // Auto Play delay slider listener
  const autoPlayDelaySlider = document.getElementById('autoPlayDelay');
  const autoPlayDelayValueDisplay = document.getElementById('autoPlayDelayValue');
  if (autoPlayDelaySlider && autoPlayDelayValueDisplay) {
    autoPlayDelaySlider.addEventListener('input', (e) => {
      autoPlayDelay = parseInt(e.target.value) * 1000; // Convert to milliseconds
      autoPlayDelayValueDisplay.textContent = e.target.value;
    });
    // Initialize delay value
    autoPlayDelay = parseInt(autoPlayDelaySlider.value) * 1000;
    autoPlayDelayValueDisplay.textContent = autoPlayDelaySlider.value;
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

function updateStreakDisplay() {
  document.getElementById("current-streak").textContent = `Current Streak: ${currentStreak}`;
  document.getElementById("max-streak").textContent = `Max Streak: ${maxStreak}`;
}

function resetStreak() {
  currentStreak = 0;
  updateStreakDisplay();
}

function incrementStreak() {
  currentStreak++;
  // Update max streak if current streak is higher
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
    // Save max streak to localStorage for the current quiz
    if (selectedQuiz) {
      const streakKey = `maxStreak_${selectedQuiz}`;
      localStorage.setItem(streakKey, maxStreak.toString());
    }
  }
  updateStreakDisplay();
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

  // Load max streak from localStorage
  const streakKey = `maxStreak_${selectedQuiz}`;
  maxStreak = parseInt(localStorage.getItem(streakKey)) || 0;
  currentStreak = 0;
  
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
      // Ensure answer is hidden in quiz mode
      document.getElementById("answer").classList.add("hidden");
      document.getElementById("answer").style.display = "none";
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
    // Show streak displays only in Quiz Mode
    document.getElementById("current-streak").style.display = (mode === "quiz") ? "block" : "none";
    document.getElementById("max-streak").style.display = (mode === "quiz") ? "block" : "none";
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

  // Always hide answer first
  document.getElementById("answer").classList.add("hidden");
    const q = queue[currentQuestionIndex];
  const questionElement = document.getElementById("question");

  async function animateQuestion() {
    await typeText(questionElement, q.question);

    if (mode === "learn") {
      document.getElementById("choices").innerHTML = ""; // Hide choices
      const answerElement = document.getElementById("answer");
      answerElement.textContent = ""; // Clear previous answer
      
      if (typingAnimationEnabled) {
        // Add a small pause after the question finishes typing
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await typeText(answerElement, q.answer); // Animate the answer text
      answerElement.classList.remove("hidden");
      document.getElementById("navigation").classList.remove("hidden"); // Show arrows
      document.getElementById("skipButton").classList.add("hidden");
      document.getElementById("feedback").classList.add("hidden"); // Hide feedback
      document.getElementById("progress").textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    } else {
      // Practice or Quiz mode
      document.getElementById("navigation").classList.add("hidden"); // Hide arrows
      document.getElementById("skipButton").classList.remove("hidden");
      document.getElementById("feedback").classList.remove("hidden");
      const choicesContainer = document.getElementById("choices");
      choicesContainer.innerHTML = "";
      const shuffledChoices = [...q.choices];
      shuffle(shuffledChoices);
      
      // Add choices with a slight delay for animation
      for (let i = 0; i < shuffledChoices.length; i++) {
        const choice = shuffledChoices[i];
        const button = document.createElement("button");
        button.innerHTML = choice;
        button.onclick = () => checkAnswer(button, choice, q.answer);
        choicesContainer.appendChild(button);
        
        if (typingAnimationEnabled) {
          button.style.opacity = '0';
          button.style.transform = 'translateY(10px)';
          await new Promise(resolve => setTimeout(resolve, 100));
          button.style.transition = 'all 0.3s ease';
          button.style.opacity = '1';
          button.style.transform = 'translateY(0)';
        }
      }
      
      document.getElementById("progress").textContent = `${completedCount + 1}/${questions.length}`;
    }
  }
  
  animateQuestion();
  clearTimeout(autoPlayTimer); // Clear any existing auto-play timer
  if (mode === "learn" && isAutoPlaying && queue.length > 0) {
    autoPlayTimer = setTimeout(() => {
      if (currentQuestionIndex < queue.length - 1) {
        nextQuestion();
      } else {
        // Optionally handle end of quiz in auto-play differently or just stop
        toggleAutoPlay(); // Stop auto-play at the end of the queue
        endGame(); // Or proceed to end game screen
      }
    }, autoPlayDelay);
  }
}

function playSound(sound) {
  sound.pause();
  sound.currentTime = 0;
  try {
    sound.play().catch(function(error) {
      console.log("Sound play failed:", error);
    });
  } catch (e) {
    console.log("Sound play error:", e);
  }
}

function checkAnswer(button, choice, correctAnswer) {
  const feedback = document.getElementById("feedback");
  const currentQuestion = queue[currentQuestionIndex];
  if (choice === correctAnswer) {
    button.classList.add("correct");
    playSound(correctSound);
    feedback.textContent = "Correct! 🥳🎉";
    incrementStreak(); // Increment streak on correct answer
    if (mode === "quiz") {
      correctCount++;  // Increment correct answer count
      answeredCount++;
      // Update max streak if current streak is greater
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        // Optionally, show a message for new max streak
        feedback.textContent += " New max streak: " + maxStreak + "!";
      }
      setTimeout(nextQuestion, 1000);
    } else if (mode === "practice") {
      if (!repeatsEnabled) {
        answeredCount++;
        setTimeout(nextQuestion, 1000);
      } else if (repeatsEnabled) {
        if (!wrongAttempt) {
          answeredCount++;
          if (repeatCount < maxRepeats) {
            repeatCount++;
            setTimeout(resetQuestion, 1000);
          } else {
            setTimeout(nextQuestion, 1000);
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
    playSound(incorrectSound);
    resetStreak(); // Reset streak on wrong answer
    // If in quiz mode and user has enabled reveal option, show the correct answer
    if (mode === "quiz" && document.getElementById("revealCorrectAnswer").checked) {
      feedback.textContent = `Wrong! 😣💥 Correct Answer: ${correctAnswer}`;
    } else {
      feedback.textContent = "Wrong! 😣💥";
    }
    wrongAttempt = true;
    currentStreak = 0; // Reset current streak on wrong answer
    if (mode === "quiz") {
      answeredCount++;
      setTimeout(nextQuestion, 1000);
    }
  }
}

function prevQuestion() {
  if (isAutoPlaying && mode === 'learn') {
    toggleAutoPlay(); // Pause auto-play if manually navigating
  }
  if (mode === "learn" && currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function nextQuestion() {
  // If auto-playing, the timer in loadQuestion will handle the next step.
  // If manually clicking next while auto-play is on but paused, it should proceed.
  // If auto-play is on and active, this manual click effectively resets the timer for the *next* question.
  if (isAutoPlaying && mode === 'learn') {
    // Timer will be reset in loadQuestion
  } else if (mode === "learn" && currentQuestionIndex < queue.length - 1) {
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
    let score = `${correctCount}/${answeredCount}`;

    // Generate encouraging message based on accuracy
    let encouragingMessage = "";
    if (accuracy === "100.00") {
      encouragingMessage = "🌟 Perfect Score! You\'re absolutely crushing it! Keep that amazing energy going! 🏆";
    } else if (accuracy >= 85) {
      encouragingMessage = "🎉 Excellent work! You\'re really mastering this material! Just a bit more practice and you\'ll be perfect! 💪";
    } else if (accuracy >= 75) {
      encouragingMessage = "👍 Good job! You\'re on the right track! Keep pushing forward and you\'ll see even better results! 📈";
    } else {
      encouragingMessage = "💡 Keep going! Every attempt makes you stronger! Focus on the areas you missed and you\'ll improve in no time! 🌱";
    }

    let statsHTML = `<div style="font-size: 24px; margin-bottom: 20px;">${encouragingMessage}</div>
                     <br><strong>Time Started:</strong> ${quizStartTime.toLocaleTimeString()}<br>
                     <strong>Time Ended:</strong> ${quizEndTime.toLocaleTimeString()}<br>
                     <strong>Score:</strong> ${score}<br>
                     <strong>Accuracy:</strong> ${accuracy}%<br>
                     <strong>Time Taken:</strong> ${timeTakenSec} seconds`;
    document.getElementById("question").innerHTML = statsHTML;

    // Store detailed quiz result in sessionStorage
    let sessionQuizResults = JSON.parse(sessionStorage.getItem("sessionQuizResults")) || [];
    sessionQuizResults.push({
      name: selectedQuiz.replace(".json", ""),
      score: parseFloat(accuracy), // Use accuracy for sorting, or derive a sortable score
      scoreDisplay: score,
      timeTaken: timeTakenSec
    });
    sessionStorage.setItem("sessionQuizResults", JSON.stringify(sessionQuizResults));

  } else {
    // For practice mode, show a general encouraging message
    document.getElementById("question").innerHTML = "🌟 Great practice session! Remember: consistent practice leads to mastery! 💪";
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
    let score = `${correctCount}/${answeredCount}`;
    let statsHTML = `<br><br><strong>Time Started:</strong> ${quizStartTime.toLocaleTimeString()}<br>
                     <strong>Time Ended:</strong> ${quizEndTime.toLocaleTimeString()}<br>
                     <strong>Score:</strong> ${score}<br>
                     <strong>Accuracy:</strong> ${accuracy}%<br>
                     <strong>Time Taken:</strong> ${timeTakenSec} seconds`;
    document.getElementById("question").innerHTML = "Quiz Ended Early!" + statsHTML;

    // Store detailed quiz result in sessionStorage
    let sessionQuizResults = JSON.parse(sessionStorage.getItem("sessionQuizResults")) || [];
    sessionQuizResults.push({
      name: selectedQuiz.replace(".json", ""),
      score: parseFloat(accuracy), // Use accuracy for sorting
      scoreDisplay: score,
      timeTaken: timeTakenSec
    });
    sessionStorage.setItem("sessionQuizResults", JSON.stringify(sessionQuizResults));

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
  currentStreak = 0;
  document.getElementById("quoteDisplay").classList.add("hidden");
  if (isAutoPlaying) {
    toggleAutoPlay(); // Stop auto-play when resetting game
  }
  document.getElementById('autoPlayToggle').style.display = 'none';
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
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("chart-screen").classList.remove("hidden");

  const resultsTableBody = document.getElementById("quizResultsTableBody");
  resultsTableBody.innerHTML = ""; // Clear previous results

  let sessionQuizResults = JSON.parse(sessionStorage.getItem("sessionQuizResults")) || [];

  if (sessionQuizResults.length === 0) {
    resultsTableBody.innerHTML = "<tr><td colspan='3'>No quiz data available for this session yet.</td></tr>";
    // Hide the table headers if no data
    document.getElementById("quizResultsTable").querySelector("thead").style.display = 'none';
    return;
  }
   // Show the table headers if there is data
  document.getElementById("quizResultsTable").querySelector("thead").style.display = '';


  // Sort results by score (descending)
  sessionQuizResults.sort((a, b) => b.score - a.score);

  sessionQuizResults.forEach(result => {
    const row = resultsTableBody.insertRow();
    row.insertCell().textContent = result.name;
    row.insertCell().textContent = result.scoreDisplay + ` (${result.score.toFixed(2)}%)`;
    row.insertCell().textContent = result.timeTaken + "s";
  });
}

window.onload = loadQuizFiles;

// New variables for Learn Mode auto-play feature
let autoPlayEnabled = false;
let autoPlayDelay = 5000; // Default 5 seconds
let autoPlayTimer = null;
let isAutoPlaying = false;

// Toggle Auto Play feature
function toggleAutoPlay() {
  const autoPlayToggleButton = document.getElementById('autoPlayToggle');
  if (mode === 'learn' && autoPlayEnabled) {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
      autoPlayToggleButton.textContent = 'Pause';
      // Start the timer for the current question if it's not already started by loadQuestion
      // This ensures that if you pause and then play on the same question, it continues from there.
      clearTimeout(autoPlayTimer);
      autoPlayTimer = setTimeout(() => {
        if (currentQuestionIndex < queue.length - 1) {
          nextQuestion();
        } else {
          toggleAutoPlay(); // Stop at end
          endGame();
        }
      }, autoPlayDelay);
    } else {
      autoPlayToggleButton.textContent = 'Play';
      clearTimeout(autoPlayTimer);
    }
  } else {
    isAutoPlaying = false;
    autoPlayToggleButton.textContent = 'Play';
    autoPlayToggleButton.style.display = 'none';
    clearTimeout(autoPlayTimer);
  }
}