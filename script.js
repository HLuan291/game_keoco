const defaultQuestions = [
  {
    text: "THỦ ĐÔ CỦA VIỆT NAM LÀ GÌ?",
    answers: ["HÀ NỘI", "ĐÀ NẴNG", "TP. HỒ CHÍ MINH", "HUẾ"],
    correct: 0
  },
  {
    text: "5 + 7 = ?",
    answers: ["10", "11", "12", "13"],
    correct: 2
  },
  {
    text: "TỪ NÀO LÀ DANH TỪ?",
    answers: ["CHẠY", "ĐẸP", "QUYỂN SÁCH", "NHANH"],
    correct: 2
  },
  {
    text: "NƯỚC SÔI Ở BAO NHIÊU ĐỘ C?",
    answers: ["50", "80", "100", "120"],
    correct: 2
  },
  {
    text: "HÀNH TINH NÀO GẦN MẶT TRỜI NHẤT?",
    answers: ["SAO THỦY", "SAO KIM", "TRÁI ĐẤT", "SAO HỎA"],
    correct: 0
  }
];

const state = {
  teamA: "ĐỘI MẶT TRỜI",
  teamB: "ĐỘI CẦU VỒNG",
  questionCount: 5,
  timePerQuestion: 30,
  answerCount: 4,
  questions: structuredClone(defaultQuestions),
  currentQuestion: 0,
  currentTeam: "A",
  pull: 0,
  scoreA: 0,
  scoreB: 0,
  timer: null,
  remaining: 30,
  running: false,
  answered: false
};

const sounds = {
  right: new Audio("assets/right-answer.mp3"),
  wrong: new Audio("assets/wrong-answer.mp3"),
  win: new Audio("assets/win.mp3")
};

sounds.right.volume = 0.9;
sounds.wrong.volume = 0.9;
sounds.win.volume = 0.9;
Object.values(sounds).forEach((audio) => {
  audio.preload = "auto";
  audio.load();
});
const soundStops = new WeakMap();

const els = {
  teamAName: document.querySelector("#teamAName"),
  teamBName: document.querySelector("#teamBName"),
  teamAScore: document.querySelector("#teamAScore"),
  teamBScore: document.querySelector("#teamBScore"),
  turnLabel: document.querySelector("#turnLabel"),
  ropeScene: document.querySelector("#ropeScene"),
  timerText: document.querySelector("#timerText"),
  timerCircle: document.querySelector("#timerCircle"),
  questionIndex: document.querySelector("#questionIndex"),
  questionText: document.querySelector("#questionText"),
  answers: document.querySelector("#answers"),
  message: document.querySelector("#message"),
  winnerOverlay: document.querySelector("#winnerOverlay"),
  winnerText: document.querySelector("#winnerText"),
  startBtn: document.querySelector("#startBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  editBtn: document.querySelector("#editBtn"),
  editorDialog: document.querySelector("#editorDialog"),
  teamAInput: document.querySelector("#teamAInput"),
  teamBInput: document.querySelector("#teamBInput"),
  questionCountInput: document.querySelector("#questionCountInput"),
  timeInput: document.querySelector("#timeInput"),
  answerCountInput: document.querySelector("#answerCountInput"),
  applySettingsBtn: document.querySelector("#applySettingsBtn"),
  saveQuestionsBtn: document.querySelector("#saveQuestionsBtn"),
  questionForms: document.querySelector("#questionForms")
};

function normalizeText(value) {
  return String(value || "").trim().toLocaleUpperCase("vi-VN");
}

function saveState() {
  localStorage.setItem("tug-war-quiz-game", JSON.stringify({
    teamA: state.teamA,
    teamB: state.teamB,
    questionCount: state.questionCount,
    timePerQuestion: state.timePerQuestion,
    answerCount: state.answerCount,
    questions: state.questions
  }));
}

function loadState() {
  const saved = localStorage.getItem("tug-war-quiz-game");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.teamA = parsed.teamA || state.teamA;
    state.teamB = parsed.teamB || state.teamB;
    state.questionCount = Number(parsed.questionCount) || state.questionCount;
    state.timePerQuestion = Number(parsed.timePerQuestion) || state.timePerQuestion;
    state.answerCount = Number(parsed.answerCount) || state.answerCount;
    state.questions = Array.isArray(parsed.questions) ? parsed.questions : state.questions;
  } catch {
    // Giữ dữ liệu mẫu nếu dữ liệu cũ bị lỗi.
  }
}

function ensureQuestions() {
  while (state.questions.length < state.questionCount) {
    state.questions.push({
      text: `CÂU HỎI ${state.questions.length + 1}`,
      answers: Array.from({ length: state.answerCount }, (_, index) => `ĐÁP ÁN ${index + 1}`),
      correct: 0
    });
  }

  state.questions = state.questions.slice(0, state.questionCount).map((question, index) => {
    const answers = [...(question.answers || [])];
    while (answers.length < state.answerCount) answers.push(`ĐÁP ÁN ${answers.length + 1}`);
    return {
      text: question.text || `CÂU HỎI ${index + 1}`,
      answers: answers.slice(0, state.answerCount),
      correct: Math.min(Number(question.correct) || 0, state.answerCount - 1)
    };
  });
}

function syncEditorInputs() {
  els.teamAInput.value = state.teamA;
  els.teamBInput.value = state.teamB;
  els.questionCountInput.value = state.questionCount;
  els.timeInput.value = state.timePerQuestion;
  els.answerCountInput.value = state.answerCount;
}

function renderAll() {
  ensureQuestions();
  renderScoreboard();
  renderTimer();
  renderQuestion();
}

function renderScoreboard() {
  els.teamAName.textContent = state.teamA;
  els.teamBName.textContent = state.teamB;
  els.teamAScore.textContent = state.scoreA;
  els.teamBScore.textContent = state.scoreB;
  els.turnLabel.textContent = state.currentTeam === "A" ? state.teamA : state.teamB;
  els.ropeScene.style.setProperty("--pull", `${state.pull * 32}px`);
}

function renderTimer() {
  els.timerText.textContent = state.remaining;
  const circumference = 327;
  const ratio = state.timePerQuestion ? state.remaining / state.timePerQuestion : 1;
  els.timerCircle.style.strokeDashoffset = String(circumference * (1 - ratio));
}

function renderQuestion() {
  const question = state.questions[state.currentQuestion];
  els.questionIndex.textContent = `CÂU ${state.currentQuestion + 1} / ${state.questionCount}`;
  els.questionText.textContent = question ? question.text : "CHƯA CÓ CÂU HỎI";
  els.answers.innerHTML = "";

  if (!question) return;

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = `${String.fromCharCode(65 + index)}. ${answer}`;
    button.addEventListener("click", () => chooseAnswer(index));
    els.answers.appendChild(button);
  });
}

function renderEditor() {
  syncEditorInputs();
  ensureQuestions();
  els.questionForms.innerHTML = "";

  state.questions.forEach((question, questionIndex) => {
    const form = document.createElement("article");
    form.className = "question-form";
    form.innerHTML = `
      <h4>CÂU ${questionIndex + 1}</h4>
      <label>
        NỘI DUNG CÂU HỎI
        <input type="text" data-kind="question" data-question="${questionIndex}" value="${escapeHtml(question.text)}" />
      </label>
      <div class="answer-list">
        ${question.answers.map((answer, answerIndex) => `
          <div class="answer-row">
            <input type="text" data-kind="answer" data-question="${questionIndex}" data-answer="${answerIndex}" value="${escapeHtml(answer)}" />
            <label>
              <input type="radio" name="correct-${questionIndex}" data-kind="correct" data-question="${questionIndex}" data-answer="${answerIndex}" ${answerIndex === question.correct ? "checked" : ""} />
              ĐÚNG
            </label>
          </div>
        `).join("")}
      </div>
    `;
    els.questionForms.appendChild(form);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function startGame() {
  unlockSounds();
  resetRuntime(false);
  hideWinnerOverlay();
  state.running = true;
  els.message.textContent = `${state.currentTeam === "A" ? state.teamA : state.teamB} TRẢ LỜI TRƯỚC.`;
  startTimer();
  renderAll();
}

function startTimer() {
  clearInterval(state.timer);
  state.remaining = state.timePerQuestion;
  renderTimer();
  state.timer = setInterval(() => {
    state.remaining -= 1;
    renderTimer();
    if (state.remaining <= 0) {
      clearInterval(state.timer);
      state.answered = true;
      els.message.textContent = "HẾT GIỜ! KHÔNG ĐỘI NÀO KÉO ĐƯỢC DÂY Ở CÂU NÀY.";
      revealCorrect();
      playClip(sounds.wrong, 1000);
      setTimeout(autoAdvanceAfterAnswer, 1000);
    }
  }, 1000);
}

function chooseAnswer(index) {
  if (!state.running || state.answered) return;
  state.answered = true;
  clearInterval(state.timer);

  const question = state.questions[state.currentQuestion];
  const correct = index === question.correct;
  const answerButtons = [...document.querySelectorAll(".answer-button")];
  answerButtons[index]?.classList.add(correct ? "correct" : "wrong");
  answerButtons[question.correct]?.classList.add("correct");
  answerButtons.forEach((button) => {
    button.disabled = true;
  });

  if (correct) {
    if (state.currentTeam === "A") {
      state.pull -= 1;
      state.scoreA += 1;
      els.message.textContent = `${state.teamA} TRẢ LỜI ĐÚNG, KÉO VỀ BÊN TRÁI 1 NẤC!`;
    } else {
      state.pull += 1;
      state.scoreB += 1;
      els.message.textContent = `${state.teamB} TRẢ LỜI ĐÚNG, KÉO VỀ BÊN PHẢI 1 NẤC!`;
    }
    playClip(sounds.right, 1000);
  } else {
    els.message.textContent = "CHƯA ĐÚNG! DÂY GIỮ NGUYÊN.";
    playClip(sounds.wrong, 1000);
  }

  renderScoreboard();
  if (!checkWinner()) {
    setTimeout(autoAdvanceAfterAnswer, 1000);
  }
}

function revealCorrect() {
  const question = state.questions[state.currentQuestion];
  const answerButtons = [...document.querySelectorAll(".answer-button")];
  answerButtons[question.correct]?.classList.add("correct");
  answerButtons.forEach((button) => {
    button.disabled = true;
  });
}

function nextQuestion() {
  if (!state.running) return;
  if (checkWinner()) return;

  state.currentQuestion += 1;
  if (state.currentQuestion >= state.questionCount) {
    finishGame();
    return;
  }

  state.currentTeam = state.currentTeam === "A" ? "B" : "A";
  state.answered = false;
  els.message.textContent = `ĐẾN LƯỢT ${state.currentTeam === "A" ? state.teamA : state.teamB}.`;
  startTimer();
  renderAll();
}

function autoAdvanceAfterAnswer() {
  if (!state.running) return;
  nextQuestion();
}

function checkWinner() {
  if (state.pull <= -5) {
    finishGame(winnerMessage(state.teamA));
    return true;
  }
  if (state.pull >= 5) {
    finishGame(winnerMessage(state.teamB));
    return true;
  }
  return false;
}

function finishGame(customMessage) {
  clearInterval(state.timer);
  state.running = false;
  const message = customMessage || finalScoreMessage();
  els.message.textContent = message;
  showWinnerOverlay(message);
  playClip(sounds.win, 5000);
}

function finalScoreMessage() {
  if (state.scoreA > state.scoreB) return winnerMessage(state.teamA);
  if (state.scoreB > state.scoreA) return winnerMessage(state.teamB);
  return "HAI ĐỘI HÒA NHAU!";
}

function winnerMessage(teamName) {
  return `CHÚC MỪNG ${teamName} ĐÃ CHIẾN THẮNG!`;
}

function resetRuntime(render = true) {
  clearInterval(state.timer);
  hideWinnerOverlay();
  state.currentQuestion = 0;
  state.currentTeam = "A";
  state.pull = 0;
  state.scoreA = 0;
  state.scoreB = 0;
  state.remaining = state.timePerQuestion;
  state.running = false;
  state.answered = false;
  els.message.textContent = "ĐỘI TRẢ LỜI ĐÚNG SẼ KÉO DÂY VỀ PHÍA MÌNH 1 NẤC.";
  if (render) renderAll();
}

function applySettings() {
  state.teamA = normalizeText(els.teamAInput.value) || "ĐỘI MẶT TRỜI";
  state.teamB = normalizeText(els.teamBInput.value) || "ĐỘI CẦU VỒNG";
  state.questionCount = clamp(Number(els.questionCountInput.value) || 5, 1, 30);
  state.timePerQuestion = clamp(Number(els.timeInput.value) || 30, 5, 180);
  state.answerCount = clamp(Number(els.answerCountInput.value) || 4, 2, 5);
  ensureQuestions();
  saveState();
  renderEditor();
  resetRuntime(true);
}

function saveQuestionsFromEditor() {
  const inputs = els.questionForms.querySelectorAll("input");
  inputs.forEach((input) => {
    const questionIndex = Number(input.dataset.question);
    if (input.dataset.kind === "question") {
      state.questions[questionIndex].text = normalizeText(input.value) || `CÂU HỎI ${questionIndex + 1}`;
    }
    if (input.dataset.kind === "answer") {
      const answerIndex = Number(input.dataset.answer);
      state.questions[questionIndex].answers[answerIndex] = normalizeText(input.value) || `ĐÁP ÁN ${answerIndex + 1}`;
    }
    if (input.dataset.kind === "correct" && input.checked) {
      state.questions[questionIndex].correct = Number(input.dataset.answer);
    }
  });

  saveState();
  renderAll();
  els.message.textContent = "ĐÃ LƯU BỘ CÂU HỎI.";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function playClip(audio, durationMs) {
  if (!audio) return;
  clearTimeout(soundStops.get(audio));
  audio.pause();
  audio.currentTime = 0;
  const playTask = audio.play();
  if (playTask?.catch) playTask.catch(() => {});
  const stopTimer = setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, durationMs);
  soundStops.set(audio, stopTimer);
}

function unlockSounds() {
  Object.values(sounds).forEach((audio) => {
    const oldVolume = audio.volume;
    audio.volume = 0;
    audio.currentTime = 0;
    const playTask = audio.play();
    if (playTask?.then) {
      playTask
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = oldVolume;
        })
        .catch(() => {
          audio.volume = oldVolume;
        });
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = oldVolume;
    }
  });
}

function showWinnerOverlay(message) {
  els.winnerText.textContent = message;
  els.winnerOverlay.hidden = false;
  els.winnerOverlay.classList.remove("show");
  void els.winnerOverlay.offsetWidth;
  els.winnerOverlay.classList.add("show");
  els.winnerOverlay.setAttribute("aria-hidden", "false");
}

function hideWinnerOverlay() {
  els.winnerOverlay.classList.remove("show");
  els.winnerOverlay.setAttribute("aria-hidden", "true");
  els.winnerOverlay.hidden = true;
}

els.startBtn.addEventListener("click", startGame);
els.nextBtn.addEventListener("click", nextQuestion);
els.resetBtn.addEventListener("click", () => resetRuntime(true));
els.editBtn.addEventListener("click", () => {
  renderEditor();
  if (typeof els.editorDialog.showModal === "function") els.editorDialog.showModal();
  else els.editorDialog.setAttribute("open", "");
});
els.applySettingsBtn.addEventListener("click", applySettings);
els.saveQuestionsBtn.addEventListener("click", saveQuestionsFromEditor);

loadState();
ensureQuestions();
syncEditorInputs();
resetRuntime(true);
