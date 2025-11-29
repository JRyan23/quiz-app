// Quiz App JavaScript
class QuizApp {
  constructor() {
    this.categorySelect = document.getElementById("category");
    this.quizContainer = document.getElementById("quizContainer");
    this.questions = [];
    this.customQuestions = [];
    this.currentQuestion = 0;
    this.score = 0;
    this.isAnswered = false;
    this.selectedDifficulty = "";

    this.init();
  }

  init() {
    this.loadCategories();
    this.showSection("home");
    this.checkSharedDraft(); // <-- added to load shared draft from URL
  }

  showSection(id) {
    // Hide all sections
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.remove("active");
    });

    // Show target section
    document.getElementById(id).classList.add("active");

    // Load data if needed
    if (id === "history") this.loadHistory();
    if (id === "highscores") this.loadScores();

    // NEW: When entering "create", load drafts
    if (id === "create") this.loadDrafts();
  }

  async loadCategories() {
    try {
      const response = await fetch("https://opentdb.com/api_category.php");
      const data = await response.json();

      this.categorySelect.innerHTML = data.trivia_categories
        .map(
          (category) =>
            `<option value="${category.id}">${category.name}</option>`
        )
        .join("");
    } catch (error) {
      console.error("Failed to load categories:", error);
      this.categorySelect.innerHTML =
        '<option value="">Failed to load categories</option>';
    }
  }

  async startQuiz() {
    const amount = document.getElementById("numQuestions").value;
    const category = document.getElementById("category").value;
    const difficultyParam = this.selectedDifficulty
      ? `&difficulty=${this.selectedDifficulty}`
      : "";

    try {
      const response = await fetch(
        `https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple${difficultyParam}`
      );
      const data = await response.json();

      if (data.results.length === 0) {
        alert("No questions available for this category. Please try another.");
        return;
      }

      this.questions = data.results;
      this.resetQuiz();
      this.showSection("quiz");
      this.displayQuestion();
    } catch (error) {
      console.error("Failed to load quiz:", error);
      alert("Failed to load quiz. Please check your connection and try again.");
    }
  }

  startCustomQuiz() {
    if (this.customQuestions.length === 0) {
      alert("Please add at least one question to start the quiz.");
      return;
    }

    const invalidQuestions = this.customQuestions.filter(
      (q) => !q.question || !q.correct || q.options.length < 2
    );

    if (invalidQuestions.length > 0) {
      alert(
        "Please complete all questions with at least 2 options and a correct answer."
      );
      return;
    }

    this.questions = this.customQuestions.map((q) => ({
      question: q.question,
      correct_answer: q.correct,
      incorrect_answers: q.options.filter((option) => option !== q.correct),
    }));

    this.resetQuiz();
    this.showSection("quiz");
    this.displayQuestion();
  }

  resetQuiz() {
    this.currentQuestion = 0;
    this.score = 0;
    this.isAnswered = false;
  }

  updateQuizHeader() {
    const currentQuestionSpan = document.querySelector(".current-question");
    const totalQuestionsSpan = document.querySelector(".total-questions");
    const currentScoreSpan = document.getElementById("currentScore");

    if (currentQuestionSpan)
      currentQuestionSpan.textContent = this.currentQuestion + 1;
    if (totalQuestionsSpan)
      totalQuestionsSpan.textContent = this.questions.length;
    if (currentScoreSpan) currentScoreSpan.textContent = this.score;
  }

  setQuestionCount(count) {
    document.getElementById("numQuestions").value = count;
    document
      .querySelectorAll(".quick-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-value="${count}"]`).classList.add("active");
  }

  updateQuestionCount() {
    const value = document.getElementById("numQuestions").value;
    document
      .querySelectorAll(".quick-btn")
      .forEach((btn) => btn.classList.remove("active"));
    const matchingBtn = document.querySelector(`[data-value="${value}"]`);
    if (matchingBtn) matchingBtn.classList.add("active");
  }

  setDifficulty(difficulty) {
    document
      .querySelectorAll(".difficulty-pill")
      .forEach((pill) => pill.classList.remove("active"));
    document
      .querySelector(`[data-value="${difficulty}"]`)
      .classList.add("active");
    this.selectedDifficulty = difficulty;
  }

  addCustomQuestion() {
    const form = document.getElementById("customQuizForm");
    const index = this.customQuestions.length;

    const questionDiv = document.createElement("div");
    questionDiv.className = "question-form";
    questionDiv.innerHTML = `
      <div class="form-group">
        <label>Question ${index + 1}:</label>
        <input type="text" class="question-input" placeholder="Enter your question" data-index="${index}" data-field="question">
      </div>

      <div class="form-group">
        <label>Answer Options (comma separated):</label>
        <input type="text" class="options-input" placeholder="Option 1, Option 2, Option 3, Option 4" data-index="${index}" data-field="options">
      </div>

      <div class="form-group">
        <label>Correct Answer:</label>
        <input type="text" class="correct-input" placeholder="Enter the correct answer" data-index="${index}" data-field="correct">
      </div>

      <button type="button" class="btn btn-secondary" onclick="quizApp.removeCustomQuestion(${index})">
        <i class="fas fa-trash"></i>
        Remove Question
      </button>
    `;

    form.appendChild(questionDiv);

    this.customQuestions.push({
      question: "",
      options: [],
      correct: "",
    });

    const inputs = questionDiv.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("input", (e) => this.updateCustomQuestion(e));
    });
  }

  removeCustomQuestion(index) {
    const form = document.getElementById("customQuizForm");
    const questionDivs = form.querySelectorAll(".question-form");

    if (questionDivs[index]) {
      questionDivs[index].remove();
      this.customQuestions.splice(index, 1);
      this.reindexCustomQuestions();
    }
  }

  reindexCustomQuestions() {
    const form = document.getElementById("customQuizForm");
    const questionDivs = form.querySelectorAll(".question-form");

    questionDivs.forEach((div, newIndex) => {
      const label = div.querySelector("label");
      if (label) label.textContent = `Question ${newIndex + 1}:`;

      const inputs = div.querySelectorAll("input");
      inputs.forEach((input) => {
        input.setAttribute("data-index", newIndex);
      });

      const removeBtn = div.querySelector("button");
      if (removeBtn) {
        removeBtn.setAttribute(
          "onclick",
          `quizApp.removeCustomQuestion(${newIndex})`
        );
      }
    });
  }

  updateCustomQuestion(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);
    const field = input.dataset.field;

    if (field === "options") {
      this.customQuestions[index][field] = input.value
        .split(",")
        .map((option) => option.trim())
        .filter((option) => option.length > 0);
    } else {
      this.customQuestions[index][field] = input.value;
    }
  }

  displayQuestion() {
    if (this.currentQuestion >= this.questions.length) {
      this.endQuiz();
      return;
    }

    this.isAnswered = false;
    const question = this.questions[this.currentQuestion];
    const answers = [...question.incorrect_answers, question.correct_answer];

    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    this.quizContainer.innerHTML = `
      <div class="quiz-question">
        <div class="question-text">${this.decodeHTML(question.question)}</div>
        <div class="answers-grid">
          ${answers
            .map(
              (answer) => `
            <div class="answer-option" onclick="quizApp.selectAnswer('${this.escapeHtml(
              answer
            )}')">
              ${this.decodeHTML(answer)}
            </div>
        `
            )
            .join("")}
        </div>
      </div>
    `;

    this.updateQuizHeader();
  }

  selectAnswer(selectedAnswer) {
    if (this.isAnswered) return;

    this.isAnswered = true;
    const question = this.questions[this.currentQuestion];
    const correctAnswer = question.correct_answer;
    const answerElements = document.querySelectorAll(".answer-option");

    answerElements.forEach((element) => {
      const elementText = element.textContent.trim();

      if (elementText === this.decodeHTML(correctAnswer)) {
        element.classList.add("correct");
      } else if (elementText === this.decodeHTML(selectedAnswer)) {
        element.classList.add("incorrect");
      }

      element.style.pointerEvents = "none";
    });

    if (selectedAnswer === correctAnswer) {
      this.score++;
    }

    setTimeout(() => {
      this.currentQuestion++;
      this.displayQuestion();
    }, 1500);
  }

  endQuiz() {
    this.saveHistory(this.score, this.questions.length);

    const finalScore = document.getElementById("finalScore");
    const percentage = Math.round((this.score / this.questions.length) * 100);

    finalScore.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">${this.score}/${this.questions.length}</div>
      <div style="font-size: 24px; color: #ffd700;">${percentage}% Correct</div>
    `;

    this.showSection("results");
  }

  savePlayerScore() {
    const playerName =
      document.getElementById("playerName").value.trim() || "Anonymous";
    let scores = JSON.parse(localStorage.getItem("highscores")) || [];

    const newScore = {
      name: playerName,
      score: this.score,
      total: this.questions.length,
      percentage: Math.round((this.score / this.questions.length) * 100),
      date: new Date().toLocaleDateString(),
    };

    scores.push(newScore);
    scores.sort((a, b) => b.percentage - a.percentage || b.score - a.score);
    scores = scores.slice(0, 10);

    localStorage.setItem("highscores", JSON.stringify(scores));
    this.showSection("highscores");
  }

  retryQuiz() {
    this.resetQuiz();
    this.showSection("quiz");
    this.displayQuestion();
  }

  saveHistory(score, total) {
    let history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    const newEntry = {
      date: new Date().toLocaleString(),
      score: score,
      total: total,
      percentage: Math.round((score / total) * 100),
    };

    history.unshift(newEntry);
    history = history.slice(0, 50);
    localStorage.setItem("quizHistory", JSON.stringify(history));
  }

  loadHistory() {
    const history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    const historyList = document.getElementById("historyList");

    if (history.length === 0) {
      historyList.innerHTML =
        '<li style="text-align: center; opacity: 0.6;">No quiz history yet. Start a quiz to see your progress!</li>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (entry) => `
      <li>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${entry.score}/${entry.total}</strong> 
            <span style="color: #ffd700;">(${entry.percentage}%)</span>
          </div>
          <div style="opacity: 0.7; font-size: 14px;">${entry.date}</div>
        </div>
      </li>
    `
      )
      .join("");
  }

  loadScores() {
    const scores = JSON.parse(localStorage.getItem("highscores")) || [];
    const scoreList = document.getElementById("scoreList");

    if (scores.length === 0) {
      scoreList.innerHTML =
        '<li style="text-align: center; opacity: 0.6;">No high scores yet. Complete a quiz and save your score!</li>';
      return;
    }

    scoreList.innerHTML = scores
      .map(
        (score) => `
      <li>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div><strong>${score.name}</strong></div>
          <div>
            <span style="color: #ffd700; font-weight: 600;">${score.percentage}%</span>
            <span style="opacity: 0.7; margin-left: 8px;">(${score.score}/${score.total})</span>
          </div>
        </div>
        <div style="font-size: 12px; opacity: 0.6; margin-top: 4px;">${score.date}</div>
      </li>
    `
      )
      .join("");
  }

  showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, #56ab2f, #a8e6cf);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 500;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ==================================================
                D R A F T   S Y S T E M
  =================================================== */

  loadDrafts() {
    const draftList = document.getElementById("draftList");
    const drafts = JSON.parse(localStorage.getItem("quizDrafts")) || [];

    if (drafts.length === 0) {
      draftList.innerHTML = `
        <div class="draft-card" style="opacity: 0.6; text-align:center;">
          No drafts saved.
        </div>`;
      return;
    }

    draftList.innerHTML = drafts
      .map(
        (draft, index) => `
      <div class="draft-card">
        <div class="draft-card-title">${draft.title}</div>
        <div class="draft-card-meta">${draft.questions.length} Questions</div>

        <div style="margin-top:12px; display:flex; gap:10px;">
          <button class="btn btn-primary" onclick="quizApp.loadDraft(${index})">
            Load
          </button>
          <button class="btn btn-primary" onclick="quizApp.shareDraft(${index})">
            Share
          </button>
          <button class="btn btn-secondary" onclick="quizApp.deleteDraft(${index})">
            Delete
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  saveDraftQuiz() {
    if (this.customQuestions.length === 0) {
      alert("Add questions before saving a draft.");
      return;
    }

    const title = prompt("Enter a name for this draft quiz:");

    if (!title || title.trim() === "") {
      alert("Draft name cannot be empty.");
      return;
    }

    const drafts = JSON.parse(localStorage.getItem("quizDrafts")) || [];

    drafts.push({
      title: title.trim(),
      questions: this.customQuestions,
    });

    localStorage.setItem("quizDrafts", JSON.stringify(drafts));

    this.showNotification("Draft Saved!");
    this.loadDrafts();
  }

  loadDraft(index) {
    const drafts = JSON.parse(localStorage.getItem("quizDrafts")) || [];
    const draft = drafts[index];
    if (!draft) return;

    this.customQuestions = [];
    document.getElementById("customQuizForm").innerHTML = "";

    draft.questions.forEach((q) => {
      this.addCustomQuestion();
      const lastIndex = this.customQuestions.length - 1;

      this.customQuestions[lastIndex] = {
        question: q.question,
        options: q.options,
        correct: q.correct,
      };
    });

    this.renderCustomQuestionInputs();

    this.showNotification(`Draft "${draft.title}" loaded!`);
  }

  deleteDraft(index) {
    const drafts = JSON.parse(localStorage.getItem("quizDrafts")) || [];
    drafts.splice(index, 1);

    localStorage.setItem("quizDrafts", JSON.stringify(drafts));
    this.loadDrafts();
    this.showNotification("Draft deleted");
  }

  renderCustomQuestionInputs() {
    const form = document.getElementById("customQuizForm");
    form.innerHTML = "";

    this.customQuestions.forEach((q, i) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "question-form";

      questionDiv.innerHTML = `
        <div class="form-group">
          <label>Question ${i + 1}:</label>
          <input type="text" class="question-input" value="${q.question}"
              data-index="${i}" data-field="question">
        </div>

        <div class="form-group">
          <label>Answer Options (comma separated):</label>
          <input type="text" class="options-input" value="${q.options.join(
            ", "
          )}"
              data-index="${i}" data-field="options">
        </div>

        <div class="form-group">
          <label>Correct Answer:</label>
          <input type="text" class="correct-input" value="${q.correct}"
              data-index="${i}" data-field="correct">
        </div>

        <button type="button" class="btn btn-secondary"
            onclick="quizApp.removeCustomQuestion(${i})">
          <i class="fas fa-trash"></i> Remove Question
        </button>
      `;

      form.appendChild(questionDiv);

      questionDiv.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", (e) => this.updateCustomQuestion(e));
      });
    });
  }

  /* ========================
          SHARE FEATURE
  ========================= */

  shareDraft(index) {
    const drafts = JSON.parse(localStorage.getItem("quizDrafts")) || [];
    const draft = drafts[index];
    if (!draft) return;

    // Replace with your GitHub Pages URL
    const githubPagesURL = "https://jryan23.github.io/quiz-app/quiz/index.html
";

    const shareText = `Take this quiz: ${githubPagesURL}#create\nDraft: "${draft.title}"`;

    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        this.showNotification(
          `Draft "${draft.title}" link copied to clipboard!`
        );
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy the link. Please copy manually:\n" + shareText);
      });
  }

  checkSharedDraft() {
    const urlParams = new URLSearchParams(window.location.search);
    const shared = urlParams.get("shared");
    if (!shared) return;

    try {
      const draft = JSON.parse(decodeURIComponent(shared));
      if (draft && draft.questions && draft.questions.length > 0) {
        this.customQuestions = draft.questions;
        this.renderCustomQuestionInputs();
        this.showSection("create");
        this.showNotification(
          `Loaded shared draft: "${draft.title || "Untitled"}"`
        );
      }
    } catch (e) {
      console.error("Invalid shared draft data");
    }
  }
}

// Global instance
let quizApp;

document.addEventListener("DOMContentLoaded", () => {
  quizApp = new QuizApp();
});

// Global wrappers
function showSection(id) {
  quizApp.showSection(id);
}
function startQuiz() {
  quizApp.startQuiz();
}
function startCustomQuiz() {
  quizApp.startCustomQuiz();
}
function addCustomQuestion() {
  quizApp.addCustomQuestion();
}
function saveDraftQuiz() {
  quizApp.saveDraftQuiz();
}
function savePlayerScore() {
  quizApp.savePlayerScore();
}
function retryQuiz() {
  quizApp.retryQuiz();
}
function setQuestionCount(count) {
  quizApp.setQuestionCount(count);
}
function updateQuestionCount() {
  quizApp.updateQuestionCount();
}
function setDifficulty(difficulty) {
  quizApp.setDifficulty(difficulty);
}


