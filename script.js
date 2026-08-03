(function () {
  "use strict";

  var STORAGE_KEY = "catchword_data";
  var LEGACY_KEY = "catchword_questions";

  /* ============================================================
     DATA LAYER
  ============================================================ */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.screens) && Array.isArray(data.questions)) {
          return data;
        }
      }
    } catch (e) { /* fall through */ }

    var legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      try {
        var legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy)) {
          var defaultScreen = { id: uid(), name: "Màn 1", order: 0 };
          legacy.forEach(function (q) {
            if (q && !q.screenId) q.screenId = defaultScreen.id;
          });
          var migrated = { screens: [defaultScreen], questions: legacy };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LEGACY_KEY);
          return migrated;
        }
      } catch (e2) { /* fall through */ }
    }

    var firstScreen = { id: uid(), name: "Màn 1", order: 0 };
    return { screens: [firstScreen], questions: [] };
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screens: screens, questions: questions }));
  }

  var data = loadData();
  var screens = data.screens.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  var questions = data.questions;

  function getScreen(id) {
    return screens.find(function (s) { return s.id === id; });
  }

  function questionsForScreen(screenId) {
    return questions.filter(function (q) { return q.screenId === screenId; });
  }

  function normalizeQuestions() {
    ensureDefaultScreen();
    var changed = false;
    questions.forEach(function (q) {
      if (!q.screenId || !getScreen(q.screenId)) {
        q.screenId = screens[0].id;
        changed = true;
      }
    });
    if (changed) saveData();
  }

  function ensureDefaultScreen() {
    if (screens.length === 0) {
      screens.push({ id: uid(), name: "Màn 1", order: 0 });
      saveData();
    }
  }

  function reloadFromStorage() {
    var fresh = loadData();
    screens = fresh.screens.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    questions = fresh.questions;
    normalizeQuestions();
  }

  normalizeQuestions();

  /* ============================================================
     SOUND EFFECTS (Web Audio API — no external files needed)
  ============================================================ */
  var audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, start, dur, type, gainPeak) {
    var ctx = getCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainPeak || 0.18, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  }

  function playCorrect() {
    tone(523.25, 0, 0.14, "triangle");
    tone(659.25, 0.1, 0.14, "triangle");
    tone(783.99, 0.2, 0.28, "triangle");
  }

  function playWrong() {
    tone(180, 0, 0.18, "sawtooth", 0.14);
    tone(140, 0.09, 0.22, "sawtooth", 0.12);
  }

  /* ============================================================
     TABS
  ============================================================ */
  var tabButtons = document.querySelectorAll(".tab-btn");
  var panels = {
    play: document.getElementById("tab-play"),
    manage: document.getElementById("tab-manage")
  };
  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      Object.keys(panels).forEach(function (k) { panels[k].classList.remove("active"); });
      panels[btn.dataset.tab].classList.add("active");
      if (btn.dataset.tab === "manage") {
        renderScreenList();
        renderScreenSelect();
        renderQuestionList();
      }
      if (btn.dataset.tab === "play") renderScreenPicker();
    });
  });

  /* ============================================================
     SCREENS — manage & play pickers
  ============================================================ */
  var screenListEl = document.getElementById("screen-list");
  var inputScreenName = document.getElementById("input-screen-name");
  var btnAddScreen = document.getElementById("btn-add-screen");
  var screenError = document.getElementById("screen-error");
  var inputScreen = document.getElementById("input-screen");
  var screenPickerEl = document.getElementById("screen-picker");
  var selectedPlayScreenId = null;

  function renderScreenSelect() {
    ensureDefaultScreen();
    inputScreen.innerHTML = "";
    screens.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name + " (" + questionsForScreen(s.id).length + " câu)";
      inputScreen.appendChild(opt);
    });
  }

  function renderScreenList() {
    ensureDefaultScreen();
    screenListEl.innerHTML = "";
    screens.forEach(function (s) {
      var li = document.createElement("li");
      li.className = "screen-item";
      li.innerHTML =
        '<span class="screen-item-name">' + escapeHtml(s.name) + '</span>' +
        '<span class="screen-item-count">' + questionsForScreen(s.id).length + ' câu</span>' +
        '<div class="screen-item-actions">' +
          '<button type="button" data-action="rename">Đổi tên</button>' +
          '<button type="button" data-action="delete">Xóa</button>' +
        '</div>';

      li.querySelector('[data-action="rename"]').addEventListener("click", function () {
        var nameSpan = li.querySelector(".screen-item-name");
        var countSpan = li.querySelector(".screen-item-count");
        var actions = li.querySelector(".screen-item-actions");
        var input = document.createElement("input");
        input.type = "text";
        input.value = s.name;
        nameSpan.replaceWith(input);
        countSpan.style.display = "none";
        actions.innerHTML =
          '<button type="button" data-action="save">Lưu</button>' +
          '<button type="button" data-action="cancel">Hủy</button>';
        input.focus();
        input.select();

        actions.querySelector('[data-action="save"]').addEventListener("click", function () {
          var newName = input.value.trim();
          if (!newName) {
            screenError.textContent = "Tên màn không được để trống.";
            return;
          }
          s.name = newName;
          screenError.textContent = "";
          saveData();
          renderScreenList();
          renderScreenSelect();
          renderScreenPicker();
          renderQuestionList();
        });

        actions.querySelector('[data-action="cancel"]').addEventListener("click", function () {
          renderScreenList();
        });
      });

      li.querySelector('[data-action="delete"]').addEventListener("click", function () {
        if (screens.length <= 1) {
          screenError.textContent = "Cần giữ ít nhất một màn.";
          return;
        }
        var count = questionsForScreen(s.id).length;
        if (count > 0) {
          screenError.textContent = "Màn này còn " + count + " câu hỏi. Hãy chuyển hoặc xóa câu hỏi trước.";
          return;
        }
        screenError.textContent = "";
        screens = screens.filter(function (item) { return item.id !== s.id; });
        saveData();
        renderScreenList();
        renderScreenSelect();
        renderScreenPicker();
      });

      screenListEl.appendChild(li);
    });
  }

  btnAddScreen.addEventListener("click", function () {
    var name = inputScreenName.value.trim();
    if (!name) {
      screenError.textContent = "Vui lòng nhập tên màn.";
      return;
    }
    screenError.textContent = "";
    screens.push({ id: uid(), name: name, order: screens.length });
    saveData();
    inputScreenName.value = "";
    renderScreenList();
    renderScreenSelect();
    renderScreenPicker();
  });

  function renderScreenPicker() {
    reloadFromStorage();

    screenPickerEl.innerHTML = "";
    var hasAnyQuestion = false;

    screens.forEach(function (s) {
      var count = questionsForScreen(s.id).length;
      if (count > 0) hasAnyQuestion = true;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "screen-option" + (count === 0 ? " disabled" : "");
      btn.dataset.screenId = s.id;
      btn.innerHTML =
        '<span class="screen-name">' + escapeHtml(s.name) + '</span>' +
        '<span class="screen-count">' + count + ' câu hỏi</span>';

      if (count > 0) {
        btn.addEventListener("click", function () {
          selectedPlayScreenId = s.id;
          screenPickerEl.querySelectorAll(".screen-option").forEach(function (el) {
            el.classList.remove("selected");
          });
          btn.classList.add("selected");
        });
      }

      screenPickerEl.appendChild(btn);
    });

    if (!selectedPlayScreenId || questionsForScreen(selectedPlayScreenId).length === 0) {
      var firstWithQuestions = screens.find(function (s) {
        return questionsForScreen(s.id).length > 0;
      });
      selectedPlayScreenId = firstWithQuestions ? firstWithQuestions.id : null;
    }

    if (selectedPlayScreenId) {
      var selectedBtn = screenPickerEl.querySelector('[data-screen-id="' + selectedPlayScreenId + '"]');
      if (selectedBtn) selectedBtn.classList.add("selected");
    }

    noQuestionsMsg.classList.toggle("hidden", hasAnyQuestion);
    btnStart.disabled = !hasAnyQuestion;
  }

  /* ============================================================
     MANAGE TAB — build question form
  ============================================================ */
  var answersList = document.getElementById("answers-list");
  var inputWord = document.getElementById("input-word");
  var btnAddAnswer = document.getElementById("btn-add-answer");
  var btnSaveQuestion = document.getElementById("btn-save-question");
  var formError = document.getElementById("form-error");
  var questionListEl = document.getElementById("question-list");
  var qCountEl = document.getElementById("q-count");
  var emptyListMsg = document.getElementById("empty-list-msg");
  var editingId = null;

  function makeAnswerRow(text, correct) {
    var row = document.createElement("div");
    row.className = "answer-row";
    row.innerHTML =
      '<input type="radio" name="correct-answer" class="correct-radio" title="Đáp án đúng">' +
      '<input type="text" class="answer-text" placeholder="Nhập đáp án">' +
      '<button type="button" class="remove-answer" title="Xóa đáp án">&times;</button>';
    row.querySelector(".answer-text").value = text || "";
    row.querySelector(".correct-radio").checked = !!correct;
    row.querySelector(".remove-answer").addEventListener("click", function () {
      if (answersList.children.length > 2) {
        row.remove();
      }
    });
    return row;
  }

  function resetForm() {
    editingId = null;
    inputWord.value = "";
    answersList.innerHTML = "";
    answersList.appendChild(makeAnswerRow("", true));
    answersList.appendChild(makeAnswerRow("", false));
    formError.textContent = "";
    btnSaveQuestion.textContent = "Lưu câu hỏi";
  }

  btnAddAnswer.addEventListener("click", function () {
    answersList.appendChild(makeAnswerRow("", false));
  });

  btnSaveQuestion.addEventListener("click", function () {
    var word = inputWord.value.trim();
    var rows = Array.prototype.slice.call(answersList.querySelectorAll(".answer-row"));
    var answers = rows.map(function (row) {
      return {
        text: row.querySelector(".answer-text").value.trim(),
        correct: row.querySelector(".correct-radio").checked
      };
    }).filter(function (a) { return a.text.length > 0; });

    if (!word) {
      formError.textContent = "Vui lòng nhập từ cần hỏi.";
      return;
    }
    if (answers.length < 2) {
      formError.textContent = "Cần ít nhất 2 đáp án có nội dung.";
      return;
    }
    if (!answers.some(function (a) { return a.correct; })) {
      formError.textContent = "Hãy chọn một đáp án đúng.";
      return;
    }

    formError.textContent = "";

    if (editingId) {
      var idx = questions.findIndex(function (q) { return q.id === editingId; });
      if (idx !== -1) {
        questions[idx].word = word;
        questions[idx].answers = answers;
        questions[idx].screenId = inputScreen.value;
      }
    } else {
      questions.push({
        id: uid(),
        screenId: inputScreen.value,
        word: word,
        answers: answers
      });
    }

    saveData();
    renderScreenList();
    renderScreenSelect();
    renderScreenPicker();
    renderQuestionList();
    resetForm();
  });

  function renderQuestionList() {
    questionListEl.innerHTML = "";
    qCountEl.textContent = questions.length;
    emptyListMsg.classList.toggle("hidden", questions.length > 0);

    questions.forEach(function (q) {
      var li = document.createElement("li");
      li.className = "question-item";
      var screen = getScreen(q.screenId);
      var screenName = screen ? screen.name : "Chưa phân màn";

      var answersHtml = q.answers.map(function (a) {
        return a.correct
          ? '<span class="right">' + escapeHtml(a.text) + " ✓</span>"
          : escapeHtml(a.text);
      }).join(" · ");

      li.innerHTML =
        '<p class="q-screen">' + escapeHtml(screenName) + '</p>' +
        '<p class="q-word">' + escapeHtml(q.word) + '</p>' +
        '<p class="q-answers">' + answersHtml + '</p>' +
        '<div class="q-actions">' +
          '<button type="button" data-action="edit">Sửa</button>' +
          '<button type="button" data-action="delete">Xóa</button>' +
        '</div>';

      li.querySelector('[data-action="edit"]').addEventListener("click", function () {
        editingId = q.id;
        inputWord.value = q.word;
        if (q.screenId) inputScreen.value = q.screenId;
        answersList.innerHTML = "";
        q.answers.forEach(function (a) {
          answersList.appendChild(makeAnswerRow(a.text, a.correct));
        });
        btnSaveQuestion.textContent = "Cập nhật câu hỏi";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      li.querySelector('[data-action="delete"]').addEventListener("click", function () {
        questions = questions.filter(function (item) { return item.id !== q.id; });
        saveData();
        renderScreenList();
        renderScreenSelect();
        renderScreenPicker();
        renderQuestionList();
      });

      questionListEl.appendChild(li);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* Export / Import */
  document.getElementById("btn-export").addEventListener("click", function () {
    var payload = { screens: screens, questions: questions };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "cau-hoi-bat-chu.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("input-import").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data && Array.isArray(data.screens) && Array.isArray(data.questions)) {
          ensureDefaultScreen();
          var idMap = {};
          data.screens.forEach(function (s) {
            if (s && s.name) {
              var newId = uid();
              if (s.id) idMap[s.id] = newId;
              screens.push({ id: newId, name: s.name, order: screens.length });
            }
          });
          data.questions.forEach(function (q) {
            if (q && q.word && Array.isArray(q.answers)) {
              questions.push({
                id: uid(),
                screenId: (q.screenId && idMap[q.screenId]) || screens[0].id,
                word: q.word,
                answers: q.answers
              });
            }
          });
        } else if (Array.isArray(data)) {
          ensureDefaultScreen();
          data.forEach(function (q) {
            if (q && q.word && Array.isArray(q.answers)) {
              questions.push({
                id: uid(),
                screenId: screens[0].id,
                word: q.word,
                answers: q.answers
              });
            }
          });
        } else {
          throw new Error("invalid");
        }
        saveData();
        renderScreenList();
        renderScreenSelect();
        renderScreenPicker();
        renderQuestionList();
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  resetForm();
  renderScreenList();
  renderScreenSelect();
  renderScreenPicker();
  renderQuestionList();

  /* ============================================================
     PLAY TAB — game engine
  ============================================================ */
  var playIntro = document.getElementById("play-intro");
  var noQuestionsMsg = document.getElementById("no-questions-msg");
  var btnStart = document.getElementById("btn-start");
  var gameWrap = document.getElementById("game-wrap");
  var gameEnd = document.getElementById("game-end");
  var arena = document.getElementById("arena");
  var wordDisplay = document.getElementById("word-display");
  var progressLabel = document.getElementById("progress-label");
  var scoreLabel = document.getElementById("score-label");
  var feedbackBanner = document.getElementById("feedback-banner");
  var finalScore = document.getElementById("final-score");
  var btnReplay = document.getElementById("btn-replay");

  var screenLabel = document.getElementById("screen-label");
  var btnBackIntro = document.getElementById("btn-back-intro");

  var queue = [];
  var qIndex = 0;
  var score = 0;
  var currentScreenId = null;
  var rafId = null;
  var bubbles = []; // {el, x, y, vx, vy, w, h, locked}

  btnStart.addEventListener("click", function () {
    renderScreenPicker();
    var screenQuestions = selectedPlayScreenId ? questionsForScreen(selectedPlayScreenId) : [];
    if (screenQuestions.length === 0) {
      noQuestionsMsg.classList.remove("hidden");
      return;
    }
    getCtx(); // unlock audio on user gesture
    startGame(selectedPlayScreenId);
  });

  btnReplay.addEventListener("click", function () {
    if (currentScreenId) startGame(currentScreenId);
  });

  btnBackIntro.addEventListener("click", function () {
    stopAnimation();
    gameEnd.classList.add("hidden");
    gameWrap.classList.add("hidden");
    playIntro.classList.remove("hidden");
    renderScreenPicker();
  });

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function startGame(screenId) {
    reloadFromStorage();

    var screenQuestions = questionsForScreen(screenId);
    if (screenQuestions.length === 0) {
      noQuestionsMsg.classList.remove("hidden");
      return;
    }

    currentScreenId = screenId;
    var screen = getScreen(screenId);
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

    var q = queue[qIndex];
    wordDisplay.textContent = q.word;
    progressLabel.textContent = "Câu " + (qIndex + 1) + "/" + queue.length;
    scoreLabel.textContent = "Điểm: " + score;

    arena.innerHTML = "";
    bubbles = [];

    var answers = shuffle(q.answers);
    var arenaRect = arena.getBoundingClientRect();

    var bubbleColors = ["bubble-c0", "bubble-c1", "bubble-c2", "bubble-c3", "bubble-c4", "bubble-c5"];
    answers.forEach(function (a, i) {
      var el = document.createElement("div");
      el.className = "bubble " + bubbleColors[i % bubbleColors.length];
      el.textContent = a.text;
      el.dataset.correct = a.correct ? "1" : "0";
      arena.appendChild(el);

      var bw = el.offsetWidth || 120;
      var bh = el.offsetHeight || 56;
      var x = Math.random() * Math.max(1, arenaRect.width - bw);
      var y = Math.random() * Math.max(1, arenaRect.height - bh);
      var speed = 40 + Math.random() * 45; // px/sec
      var angle = Math.random() * Math.PI * 2;

      var bubble = {
        el: el,
        x: x, y: y,
        w: bw, h: bh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        locked: false
      };
      el.style.transform = "translate(" + x + "px," + y + "px)";

      el.addEventListener("click", function () { onBubbleClick(bubble); });
      bubbles.push(bubble);
    });

    startAnimation();
  }

  var lastTs = null;
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
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    var rect = arena.getBoundingClientRect();
    var maxW = rect.width;
    var maxH = rect.height;

    bubbles.forEach(function (b) {
      if (b.locked) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x <= 0) { b.x = 0; b.vx *= -1; }
      if (b.x + b.w >= maxW) { b.x = maxW - b.w; b.vx *= -1; }
      if (b.y <= 0) { b.y = 0; b.vy *= -1; }
      if (b.y + b.h >= maxH) { b.y = maxH - b.h; b.vy *= -1; }

      b.el.style.transform = "translate(" + b.x + "px," + b.y + "px)";
    });

    rafId = requestAnimationFrame(tick);
  }

  function onBubbleClick(bubble) {
    if (bubble.locked) return;

    if (bubble.el.dataset.correct === "1") {
      bubbles.forEach(function (b) { b.locked = true; b.el.classList.add("disabled"); });
      bubble.el.classList.add("correct-pop");
      playCorrect();
      score += 1;
      feedbackBanner.textContent = "Chính xác! ✨";
      feedbackBanner.className = "feedback-banner ok";
      scoreLabel.textContent = "Điểm: " + score;

      setTimeout(function () {
        qIndex += 1;
        if (qIndex >= queue.length) {
          endGame();
        } else {
          showQuestion();
        }
      }, 850);
    } else {
      playWrong();

      bubble.locked = true;
      bubble.el.classList.add("bubble-remove");
      bubble.el.style.opacity = "0";
      bubble.el.style.filter = "blur(1px)";
      bubble.el.style.pointerEvents = "none";

      bubbles = bubbles.filter(function (b) {
        return b !== bubble;
      });

      feedbackBanner.textContent = "Chưa đúng, đáp án này đã bị xóa. Thử lại nhé!";
      feedbackBanner.className = "feedback-banner bad";
    }
  }

  function endGame() {
    stopAnimation();
    gameWrap.classList.add("hidden");
    gameEnd.classList.remove("hidden");
    finalScore.textContent = "Điểm số: " + score + "/" + queue.length;
  }

})();
