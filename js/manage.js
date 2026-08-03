import { screens, questions, saveData, questionsForScreen, ensureDefaultScreen } from "./data.js";
import { uid, escapeHtml } from "./utils.js";
import { renderScreenPicker } from "./game.js";

const screenListEl = document.getElementById("screen-list");
const inputScreenName = document.getElementById("input-screen-name");
const btnAddScreen = document.getElementById("btn-add-screen");
const screenError = document.getElementById("screen-error");
const inputScreen = document.getElementById("input-screen");

const answersList = document.getElementById("answers-list");
const inputWord = document.getElementById("input-word");
const btnAddAnswer = document.getElementById("btn-add-answer");
const btnSaveQuestion = document.getElementById("btn-save-question");
const formError = document.getElementById("form-error");
const inputType = document.getElementById("input-type");
const labelInputWord = document.getElementById("label-input-word");
const hintInputWord = document.getElementById("hint-input-word");
const sentenceInputWrap = document.getElementById("sentence-input-wrap");
const inputSentence = document.getElementById("input-sentence");
const labelAnswers = document.getElementById("label-answers");
const questionListEl = document.getElementById("question-list");
const qCountEl = document.getElementById("q-count");
const emptyListMsg = document.getElementById("empty-list-msg");

let editingId = null;

export function renderScreenSelect() {
  ensureDefaultScreen();
  if(!inputScreen) return;
  inputScreen.innerHTML = "";
  screens.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name + " (" + questionsForScreen(s.id).length + " câu)";
    inputScreen.appendChild(opt);
  });
}

export function renderScreenList() {
  ensureDefaultScreen();
  if(!screenListEl) return;
  screenListEl.innerHTML = "";
  screens.forEach(s => {
    const li = document.createElement("li");
    li.className = "screen-item";
    li.innerHTML =
      '<span class="screen-item-name">' + escapeHtml(s.name) + '</span>' +
      '<span class="screen-item-count">' + questionsForScreen(s.id).length + ' câu</span>' +
      '<div class="screen-item-actions">' +
        '<button type="button" data-action="rename">Đổi tên</button>' +
        '<button type="button" data-action="delete">Xóa</button>' +
      '</div>';

    li.querySelector('[data-action="rename"]').addEventListener("click", () => {
      const nameSpan = li.querySelector(".screen-item-name");
      const countSpan = li.querySelector(".screen-item-count");
      const actions = li.querySelector(".screen-item-actions");
      const input = document.createElement("input");
      input.type = "text";
      input.value = s.name;
      nameSpan.replaceWith(input);
      countSpan.style.display = "none";
      actions.innerHTML =
        '<button type="button" data-action="save">Lưu</button>' +
        '<button type="button" data-action="cancel">Hủy</button>';
      input.focus();
      input.select();

      actions.querySelector('[data-action="save"]').addEventListener("click", () => {
        const newName = input.value.trim();
        if (!newName) {
          screenError.textContent = "Tên màn không được để trống.";
          return;
        }
        s.name = newName;
        screenError.textContent = "";
        saveData();
      });

      actions.querySelector('[data-action="cancel"]').addEventListener("click", () => {
        renderScreenList();
      });
    });

    li.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (screens.length <= 1) {
        screenError.textContent = "Cần giữ ít nhất một màn.";
        return;
      }
      const count = questionsForScreen(s.id).length;
      if (count > 0) {
        screenError.textContent = "Màn này còn " + count + " câu hỏi. Hãy chuyển hoặc xóa câu hỏi trước.";
        return;
      }
      screenError.textContent = "";
      const index = screens.findIndex(item => item.id === s.id);
      if(index > -1) screens.splice(index, 1);
      saveData();
    });

    screenListEl.appendChild(li);
  });
}

function makeAnswerRow(text, correct) {
  const row = document.createElement("div");
  row.className = "answer-row";
  row.innerHTML =
    '<input type="radio" name="correct-answer" class="correct-radio" title="Đáp án đúng">' +
    '<input type="text" class="answer-text" placeholder="Nhập đáp án">' +
    '<button type="button" class="remove-answer" title="Xóa đáp án">&times;</button>';
  row.querySelector(".answer-text").value = text || "";
  const radio = row.querySelector(".correct-radio");
  radio.checked = !!correct;
  if (inputType.value === "sentence") {
    radio.style.display = "none";
  } else if (inputType.value !== "single") {
    radio.type = "checkbox";
  }
  row.querySelector(".remove-answer").addEventListener("click", () => {
    if (answersList.children.length > 1) {
      row.remove();
    }
  });
  return row;
}

export function resetForm() {
  editingId = null;
  if(!inputType) return;
  inputType.value = "single";
  updateFormLabels();
  inputWord.value = "";
  inputSentence.value = "";
  answersList.innerHTML = "";
  answersList.appendChild(makeAnswerRow("", true));
  answersList.appendChild(makeAnswerRow("", false));
  formError.textContent = "";
  btnSaveQuestion.textContent = "Lưu câu hỏi";
}

function updateFormLabels() {
  const type = inputType.value;
  if (type === "single") {
    labelInputWord.classList.remove("hidden");
    inputWord.classList.remove("hidden");
    labelInputWord.textContent = "Từ / nghĩa cần hỏi";
    hintInputWord.classList.add("hidden");
    sentenceInputWrap.classList.add("hidden");
    labelAnswers.textContent = "Các đáp án (chọn nút tròn cho đáp án đúng)";
    document.querySelectorAll(".correct-radio").forEach(r => { r.type = "radio"; r.style.display = ""; });
  } else if (type === "sequence") {
    labelInputWord.classList.remove("hidden");
    inputWord.classList.remove("hidden");
    labelInputWord.textContent = "Câu hỏi / Yêu cầu";
    hintInputWord.classList.add("hidden");
    sentenceInputWrap.classList.add("hidden");
    labelAnswers.textContent = "Các đáp án (chọn nhiều đáp án đúng theo thứ tự từ trên xuống)";
    document.querySelectorAll(".correct-radio").forEach(r => { r.type = "checkbox"; r.style.display = ""; });
  } else if (type === "sentence") {
    labelInputWord.classList.add("hidden");
    inputWord.classList.add("hidden");
    hintInputWord.classList.add("hidden");
    sentenceInputWrap.classList.remove("hidden");
    labelAnswers.textContent = "Các từ nhiễu (không bắt buộc, thêm để tăng độ khó)";
    document.querySelectorAll(".correct-radio").forEach(r => { r.style.display = "none"; r.checked = false; });
  } else if (type === "fill_blank") {
    labelInputWord.classList.remove("hidden");
    inputWord.classList.remove("hidden");
    labelInputWord.textContent = "Câu hỏi";
    hintInputWord.classList.remove("hidden");
    sentenceInputWrap.classList.add("hidden");
    labelAnswers.textContent = "Các đáp án điền vào chỗ trống (theo thứ tự)";
    document.querySelectorAll(".correct-radio").forEach(r => { r.type = "checkbox"; r.style.display = ""; });
  }
}

export function renderQuestionList() {
  if(!questionListEl) return;
  questionListEl.innerHTML = "";
  qCountEl.textContent = questions.length;
  emptyListMsg.classList.toggle("hidden", questions.length > 0);

  screens.forEach(s => {
    const screenQs = questionsForScreen(s.id);
    if (screenQs.length === 0) return;

    const headerLi = document.createElement("li");
    headerLi.className = "q-group-header";
    headerLi.textContent = s.name + " (" + screenQs.length + " câu)";
    questionListEl.appendChild(headerLi);

    screenQs.forEach(q => {
      const li = document.createElement("li");
      li.className = "question-item";
      
      const answersHtml = q.answers.map(a => {
        return a.correct
          ? '<span class="right">' + escapeHtml(a.text) + " ✓</span>"
          : escapeHtml(a.text);
      }).join(" · ");

      const typeText = q.type === "sequence" ? "Ghép từ" : (q.type === "fill_blank" ? "Điền từ" : (q.type === "sentence" ? "Ghép câu" : "1 đáp án"));
      const displayWord = q.type === "sentence" ? q.answers.filter(a => a.correct).map(a => a.text).join(" ") : q.word;

      li.innerHTML =
        '<p class="q-word">' + escapeHtml(displayWord) + '<span class="q-type-badge">' + typeText + '</span></p>' +
        '<p class="q-answers">' + answersHtml + '</p>' +
        '<div class="q-actions">' +
          '<button type="button" data-action="edit">Sửa</button>' +
          '<button type="button" data-action="delete">Xóa</button>' +
        '</div>';

      li.querySelector('[data-action="edit"]').addEventListener("click", () => {
        editingId = q.id;
        inputWord.value = q.word;
        inputType.value = q.type || "single";
        
        if (q.screenId) inputScreen.value = q.screenId;
        
        answersList.innerHTML = "";
        
        if (q.type === "sentence") {
          const correctAnswers = q.answers.filter(a => a.correct);
          const wrongAnswers = q.answers.filter(a => !a.correct);
          inputSentence.value = correctAnswers.map(a => a.text).join(" ");
          
          wrongAnswers.forEach(a => {
            answersList.appendChild(makeAnswerRow(a.text, false));
          });
          if (wrongAnswers.length === 0) {
            answersList.appendChild(makeAnswerRow("", false));
          }
        } else {
          inputSentence.value = "";
          q.answers.forEach(a => {
            answersList.appendChild(makeAnswerRow(a.text, a.correct));
          });
        }
        
        updateFormLabels();
        btnSaveQuestion.textContent = "Cập nhật câu hỏi";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      li.querySelector('[data-action="delete"]').addEventListener("click", () => {
        const index = questions.findIndex(item => item.id === q.id);
        if(index > -1) questions.splice(index, 1);
        saveData();
      });

      questionListEl.appendChild(li);
    });
  });
}

export function initManage() {
  btnAddScreen.addEventListener("click", () => {
    const name = inputScreenName.value.trim();
    if (!name) {
      screenError.textContent = "Vui lòng nhập tên màn.";
      return;
    }
    screenError.textContent = "";
    screens.push({ id: uid(), name: name, order: screens.length });
    saveData();
    inputScreenName.value = "";
  });

  inputType.addEventListener("change", updateFormLabels);

  btnAddAnswer.addEventListener("click", () => {
    answersList.appendChild(makeAnswerRow("", false));
  });

  btnSaveQuestion.addEventListener("click", () => {
    let word = inputWord.value.trim();
    const type = inputType.value;
    let answers = [];

    if (type === "sentence") {
      word = "";
    }

    if (type !== "sentence" && !word) {
      formError.textContent = "Vui lòng nhập từ/nghĩa cần hỏi.";
      return;
    }

    if (type === "sentence") {
      const sentence = inputSentence.value.trim();
      if (!sentence) {
        formError.textContent = "Vui lòng nhập câu đáp án để tự động tách từ.";
        return;
      }
      const words = sentence.split(/\s+/);
      if (words.length < 2) {
        formError.textContent = "Câu đáp án phải có ít nhất 2 từ.";
        return;
      }
      words.forEach(w => {
        answers.push({ text: w, correct: true });
      });

      const rows = Array.from(answersList.querySelectorAll(".answer-row"));
      rows.forEach(row => {
        const t = row.querySelector(".answer-text").value.trim();
        if (t) answers.push({ text: t, correct: false });
      });
    } else {
      const rows = Array.from(answersList.querySelectorAll(".answer-row"));
      answers = rows.map(row => {
        return {
          text: row.querySelector(".answer-text").value.trim(),
          correct: row.querySelector(".correct-radio").checked
        };
      }).filter(a => a.text.length > 0);

      if (answers.length < 2) {
        formError.textContent = "Cần ít nhất 2 đáp án có nội dung.";
        return;
      }
    }

    const correctCount = answers.filter(a => a.correct).length;

    if (type === "single" && correctCount !== 1) {
      formError.textContent = "Chế độ 1 đáp án cần chính xác 1 đáp án đúng.";
      return;
    }
    if ((type === "sequence" || type === "sentence") && correctCount === 0) {
      formError.textContent = "Chế độ ghép từ/câu cần ít nhất 1 đáp án đúng.";
      return;
    }
    if (type === "fill_blank") {
      const blanksMatch = word.match(/___/g);
      const blanksCount = blanksMatch ? blanksMatch.length : 0;
      if (blanksCount === 0) {
        formError.textContent = "Câu hỏi cần có ít nhất 1 chỗ trống (___).";
        return;
      }
      if (correctCount !== blanksCount) {
        formError.textContent = "Số lượng đáp án đúng (" + correctCount + ") phải bằng số chỗ trống (" + blanksCount + ").";
        return;
      }
    }

    formError.textContent = "";

    if (editingId) {
      const idx = questions.findIndex(q => q.id === editingId);
      if (idx !== -1) {
        questions[idx].word = word;
        questions[idx].answers = answers;
        questions[idx].screenId = inputScreen.value;
        questions[idx].type = type;
      }
    } else {
      questions.push({
        id: uid(),
        screenId: inputScreen.value,
        word: word,
        answers: answers,
        type: type
      });
    }

    saveData();
    resetForm();
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const payload = { screens: screens, questions: questions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cau-hoi-bat-chu.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("input-import").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && Array.isArray(data.screens) && Array.isArray(data.questions)) {
          ensureDefaultScreen();
          const idMap = {};
          data.screens.forEach(s => {
            if (s && s.name) {
              const newId = uid();
              if (s.id) idMap[s.id] = newId;
              screens.push({ id: newId, name: s.name, order: screens.length });
            }
          });
          data.questions.forEach(q => {
            if (q && q.word && Array.isArray(q.answers)) {
              questions.push({
                id: uid(),
                screenId: (q.screenId && idMap[q.screenId]) || screens[0].id,
                word: q.word,
                answers: q.answers,
                type: q.type || 'single'
              });
            }
          });
        }
        saveData();
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  resetForm();
}
