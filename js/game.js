import { screens, questionsForScreen } from "./data.js";
import { shuffle, escapeHtml } from "./utils.js";
import { playCorrect, playWrong, unlockAudio, playBGM, stopBGM, pauseBGM, resumeBGM } from "./audio.js";

const screenPickerEl = document.getElementById("screen-picker");
const playIntro = document.getElementById("play-intro");
const noQuestionsMsg = document.getElementById("no-questions-msg");
const btnStart = document.getElementById("btn-start");
const gameWrap = document.getElementById("game-wrap");
const gameEnd = document.getElementById("game-end");
const arena = document.getElementById("arena");
const wordDisplay = document.getElementById("word-display");
const progressLabel = document.getElementById("progress-label");
const scoreLabel = document.getElementById("score-label");
const timerLabel = document.getElementById("timer-label");
const feedbackBanner = document.getElementById("feedback-banner");
const finalScore = document.getElementById("final-score");
const btnReplay = document.getElementById("btn-replay");
const screenLabel = document.getElementById("screen-label");
const btnBackIntro = document.getElementById("btn-back-intro");
const btnPause = document.getElementById("btn-pause");
const btnResume = document.getElementById("btn-resume");
const btnExit = document.getElementById("btn-exit");
const pauseOverlay = document.getElementById("pause-overlay");
const exitConfirmOverlay = document.getElementById("exit-confirm-overlay");
const btnConfirmExit = document.getElementById("btn-confirm-exit");
const btnCancelExit = document.getElementById("btn-cancel-exit");

let selectedPlayScreenId = null;
let isPaused = false;
let wasPausedBeforeExit = false;
let queue = [];
let qIndex = 0;
let score = 0;
let currentScreenId = null;
let rafId = null;
let bubbles = [];
let currentFilled = [];
let lastTs = null;

let timeLeft = 30;
let timerInterval = null;

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerDisplay() {
  if (!timerLabel) return;
  timerLabel.textContent = `⏳ ${timeLeft}s`;
  if (timeLeft <= 5) {
    timerLabel.classList.add("warning");
  } else {
    timerLabel.classList.remove("warning");
  }
}

function startTimer() {
  timeLeft = 30;
  updateTimerDisplay();
  resumeTimer();
}

function resumeTimer() {
  clearTimer();
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  clearTimer();
  playWrong();
  bubbles.forEach(b => { b.locked = true; b.el.classList.add("disabled"); });
  feedbackBanner.textContent = "Hết giờ! Chuyển sang câu tiếp theo...";
  feedbackBanner.className = "feedback-banner bad";
  
  setTimeout(() => {
    qIndex += 1;
    if (qIndex >= queue.length) endGame();
    else showQuestion();
  }, 1500);
}

export function renderScreenPicker() {
  if(!screenPickerEl) return;
  screenPickerEl.innerHTML = "";
  let hasAnyQuestion = false;

  screens.forEach(s => {
    const count = questionsForScreen(s.id).length;
    if (count > 0) hasAnyQuestion = true;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "screen-option" + (count === 0 ? " disabled" : "");
    btn.dataset.screenId = s.id;
    btn.innerHTML =
      '<span class="screen-name">' + escapeHtml(s.name) + '</span>' +
      '<span class="screen-count">' + count + ' câu hỏi</span>';

    if (count > 0) {
      btn.addEventListener("click", () => {
        selectedPlayScreenId = s.id;
        screenPickerEl.querySelectorAll(".screen-option").forEach(el => el.classList.remove("selected"));
        btn.classList.add("selected");
      });
    }
    screenPickerEl.appendChild(btn);
  });

  if (!selectedPlayScreenId || questionsForScreen(selectedPlayScreenId).length === 0) {
    const firstWithQuestions = screens.find(s => questionsForScreen(s.id).length > 0);
    selectedPlayScreenId = firstWithQuestions ? firstWithQuestions.id : null;
  }

  if (selectedPlayScreenId) {
    const selectedBtn = screenPickerEl.querySelector('[data-screen-id="' + selectedPlayScreenId + '"]');
    if (selectedBtn) selectedBtn.classList.add("selected");
  }

  noQuestionsMsg.classList.toggle("hidden", hasAnyQuestion);
  btnStart.disabled = !hasAnyQuestion;
}

export function initGame() {
  btnStart.addEventListener("click", () => {
    const screenQuestions = selectedPlayScreenId ? questionsForScreen(selectedPlayScreenId) : [];
    if (screenQuestions.length === 0) {
      noQuestionsMsg.classList.remove("hidden");
      return;
    }
    unlockAudio();
    startGame(selectedPlayScreenId);
  });

  btnReplay.addEventListener("click", () => {
    if (currentScreenId) startGame(currentScreenId);
  });

  btnPause.addEventListener("click", () => {
    if (isPaused || gameWrap.classList.contains("hidden") || feedbackBanner.textContent !== "") return;
    isPaused = true;
    stopAnimation();
    clearTimer();
    pauseBGM();
    pauseOverlay.classList.remove("hidden");
  });

  btnResume.addEventListener("click", () => {
    if (!isPaused) return;
    isPaused = false;
    startAnimation();
    resumeTimer();
    resumeBGM();
    pauseOverlay.classList.add("hidden");
  });

  btnExit.addEventListener("click", () => {
    if (gameWrap.classList.contains("hidden") || feedbackBanner.textContent !== "") return;
    
    wasPausedBeforeExit = isPaused;
    if (!isPaused) {
      isPaused = true;
      stopAnimation();
      clearTimer();
      pauseBGM();
    }
    exitConfirmOverlay.classList.remove("hidden");
  });

  btnCancelExit.addEventListener("click", () => {
    exitConfirmOverlay.classList.add("hidden");
    if (!wasPausedBeforeExit) {
      isPaused = false;
      startAnimation();
      resumeTimer();
      resumeBGM();
    }
  });

  btnConfirmExit.addEventListener("click", () => {
    exitConfirmOverlay.classList.add("hidden");
    isPaused = false;
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    stopAnimation();
    clearTimer();
    stopBGM();
    gameEnd.classList.add("hidden");
    gameWrap.classList.add("hidden");
    playIntro.classList.remove("hidden");
    renderScreenPicker();
  });

  btnBackIntro.addEventListener("click", () => {
    isPaused = false;
    if (pauseOverlay) pauseOverlay.classList.add("hidden");
    stopAnimation();
    clearTimer();
    stopBGM();
    gameEnd.classList.add("hidden");
    gameWrap.classList.add("hidden");
    playIntro.classList.remove("hidden");
    renderScreenPicker();
  });
}

function startGame(screenId) {
  const screenQuestions = questionsForScreen(screenId);
  if (screenQuestions.length === 0) {
    noQuestionsMsg.classList.remove("hidden");
    return;
  }

  playBGM();

  currentScreenId = screenId;
  const screen = screens.find(s => s.id === screenId);
  queue = shuffle(screenQuestions);
  qIndex = 0;
  score = 0;
  playIntro.classList.add("hidden");
  gameEnd.classList.add("hidden");
  gameWrap.classList.remove("hidden");
  screenLabel.textContent = screen ? screen.name : "";
  showQuestion();
}

function showQuestion() {
  stopAnimation();
  feedbackBanner.textContent = "";
  feedbackBanner.className = "feedback-banner";

  const q = queue[qIndex];
  const type = q.type || "single";
  const wordLabel = document.querySelector(".word-label");
  
  function bindSlotClicks(slotsClass) {
    const slots = document.querySelectorAll(slotsClass);
    slots.forEach((slot, index) => {
      slot.style.cursor = "pointer";
      slot.addEventListener("click", () => {
        if (index >= currentFilled.length || isPaused) return;
        const bubble = currentFilled[index];
        bubble.locked = false;
        bubble.el.style.display = "";
        currentFilled.splice(index, 1);
        
        slots.forEach(s => { s.textContent = ""; s.classList.remove("filled"); });
        currentFilled.forEach((b, i) => {
          if (slots[i]) {
            slots[i].textContent = b.el.textContent;
            slots[i].classList.add("filled");
          }
        });
      });
    });
  }

  if (type === "sentence") {
    wordLabel.style.display = "none";
    wordDisplay.style.display = "none";
  } else {
    wordLabel.style.display = "";
    wordDisplay.style.display = "";
    if (type === "fill_blank") {
      wordDisplay.innerHTML = escapeHtml(q.word).replace(/___/g, '<span class="blank-slot"></span>');
      bindSlotClicks(".blank-slot");
    } else {
      wordDisplay.textContent = q.word;
    }
  }

  const sequenceSlots = document.getElementById("sequence-slots");
  if (type === "sequence" || type === "sentence") {
    const correctCount = q.answers.filter(a => a.correct).length;
    sequenceSlots.innerHTML = Array(correctCount).fill('<span class="seq-slot"></span>').join('');
    bindSlotClicks(".seq-slot");
  } else {
    sequenceSlots.innerHTML = "";
  }
  
  currentFilled = [];

  progressLabel.textContent = "Câu " + (qIndex + 1) + "/" + queue.length;
  scoreLabel.textContent = "Điểm: " + score;

  arena.innerHTML = "";
  bubbles = [];

  const answers = shuffle(q.answers);
  const arenaRect = arena.getBoundingClientRect();

  const bubbleColors = ["bubble-c0", "bubble-c1", "bubble-c2", "bubble-c3", "bubble-c4", "bubble-c5"];
  answers.forEach((a, i) => {
    const el = document.createElement("div");
    el.className = "bubble " + bubbleColors[i % bubbleColors.length];
    el.textContent = a.text;
    el.dataset.correct = a.correct ? "1" : "0";
    arena.appendChild(el);

    const bw = el.offsetWidth || 120;
    const bh = el.offsetHeight || 56;
    let x = Math.random() * Math.max(1, arenaRect.width - bw);
    let y = Math.random() * Math.max(1, arenaRect.height - bh);
    const speed = (40 + Math.random() * 45) * 1.2;
    const angle = Math.random() * Math.PI * 2;

    const bubble = {
      el: el,
      x: x, y: y,
      w: bw, h: bh,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      locked: false
    };
    el.style.transform = `translate(${x}px,${y}px)`;

    el.addEventListener("click", () => onBubbleClick(bubble));
    bubbles.push(bubble);
  });

  startAnimation();
  startTimer();
}

function startAnimation() {
  lastTs = null;
  rafId = requestAnimationFrame(tick);
}

function stopAnimation() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function tick(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  const rect = arena.getBoundingClientRect();
  const maxW = rect.width;
  const maxH = rect.height;

  bubbles.forEach(b => {
    if (b.locked) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x <= 0) { b.x = 0; b.vx *= -1; }
    if (b.x + b.w >= maxW) { b.x = maxW - b.w; b.vx *= -1; }
    if (b.y <= 0) { b.y = 0; b.vy *= -1; }
    if (b.y + b.h >= maxH) { b.y = maxH - b.h; b.vy *= -1; }

    b.el.style.transform = `translate(${b.x}px,${b.y}px)`;
  });

  rafId = requestAnimationFrame(tick);
}

function onBubbleClick(bubble) {
  if (bubble.locked || isPaused) return;

  const q = queue[qIndex];
  const type = q.type || "single";

  if (type === "single") {
    if (bubble.el.dataset.correct === "1") {
      clearTimer();
      bubbles.forEach(b => { b.locked = true; b.el.classList.add("disabled"); });
      bubble.el.classList.add("correct-pop");
      playCorrect();
      score += 1;
      feedbackBanner.textContent = "Chính xác! ✨";
      feedbackBanner.className = "feedback-banner ok";
      scoreLabel.textContent = "Điểm: " + score;

      setTimeout(() => {
        qIndex += 1;
        if (qIndex >= queue.length) endGame();
        else showQuestion();
      }, 850);
    } else {
      playWrong();
      clearTimer();
      bubbles.forEach(b => { b.locked = true; b.el.classList.add("disabled"); });
      bubble.el.classList.add("wrong-shake");
      feedbackBanner.textContent = "Chưa chính xác! Chuyển sang câu tiếp theo...";
      feedbackBanner.className = "feedback-banner bad";

      setTimeout(() => {
        qIndex += 1;
        if (qIndex >= queue.length) endGame();
        else showQuestion();
      }, 1200);
    }
  } else {
    bubble.locked = true;
    bubble.el.style.display = "none";
    currentFilled.push(bubble);
    
    const slots = (type === "sequence" || type === "sentence")
      ? document.querySelectorAll(".seq-slot") 
      : document.querySelectorAll(".blank-slot");
    
    const slotIdx = currentFilled.length - 1;
    if (slots[slotIdx]) {
      slots[slotIdx].textContent = bubble.el.textContent;
      slots[slotIdx].classList.add("filled");
    }

    const correctAnswers = q.answers.filter(a => a.correct);
    if (currentFilled.length === correctAnswers.length) {
      let isCorrect = true;
      for (let i = 0; i < correctAnswers.length; i++) {
        if (currentFilled[i].el.textContent !== correctAnswers[i].text) {
          isCorrect = false;
          break;
        }
      }

      if (isCorrect) {
        clearTimer();
        bubbles.forEach(b => { b.locked = true; b.el.classList.add("disabled"); });
        slots.forEach(s => s.classList.add("correct-pop"));
        playCorrect();
        score += 1;
        feedbackBanner.textContent = "Hoàn thành xuất sắc! ✨";
        feedbackBanner.className = "feedback-banner ok";
        scoreLabel.textContent = "Điểm: " + score;

        setTimeout(() => {
          qIndex += 1;
          if (qIndex >= queue.length) endGame();
          else showQuestion();
        }, 1200);
      } else {
        playWrong();
        slots.forEach(s => s.classList.add("wrong"));
        feedbackBanner.textContent = "Chưa chính xác! Thử lại nhé.";
        feedbackBanner.className = "feedback-banner bad";
        
        setTimeout(() => {
          slots.forEach(s => { 
            s.textContent = ""; 
            s.classList.remove("filled", "wrong"); 
          });
          currentFilled.forEach(b => {
            b.locked = false;
            b.el.style.display = "";
          });
          currentFilled = [];
          feedbackBanner.textContent = "";
          feedbackBanner.className = "feedback-banner";
        }, 800);
      }
    }
  }
}

function endGame() {
  isPaused = false;
  if (pauseOverlay) pauseOverlay.classList.add("hidden");
  stopAnimation();
  clearTimer();
  stopBGM();
  gameWrap.classList.add("hidden");
  gameEnd.classList.remove("hidden");
  finalScore.textContent = "Điểm số: " + score + "/" + queue.length;
}
