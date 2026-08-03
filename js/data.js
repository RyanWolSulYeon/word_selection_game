import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./config.js";
import { uid } from "./utils.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dataDocRef = ref(db, "catchword/gamedata");

export let screens = [];
export let questions = [];

let onDataUpdateCallbacks = [];

export function onDataUpdate(cb) {
  onDataUpdateCallbacks.push(cb);
}

export function saveData() {
  set(dataDocRef, { screens: screens, questions: questions })
    .catch(function(err) {
      console.error("Lỗi khi lưu lên Firebase:", err);
      alert("Không thể lưu. Xem console để biết chi tiết.");
    });
}

onValue(dataDocRef, function(snapshot) {
  if (snapshot.exists()) {
    let data = snapshot.val();
    screens = (data.screens || []).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    questions = data.questions || [];
  } else {
    ensureDefaultScreen();
  }
  
  normalizeQuestions();
  
  onDataUpdateCallbacks.forEach(cb => cb());
});

export function getScreen(id) {
  return screens.find(function (s) { return s.id === id; });
}

export function questionsForScreen(screenId) {
  return questions.filter(function (q) { return q.screenId === screenId; });
}

export function normalizeQuestions() {
  if (screens.length === 0) return;
  let changed = false;
  questions.forEach(function (q) {
    if (!q.screenId || !getScreen(q.screenId)) {
      q.screenId = screens[0].id;
      changed = true;
    }
  });
  if (changed) saveData();
}

export function ensureDefaultScreen() {
  if (screens.length === 0) {
    screens.push({ id: uid(), name: "Màn 1", order: 0 });
    saveData();
  }
}

export function setQuestions(newQuestions) {
  questions = newQuestions;
}

export function setScreens(newScreens) {
  screens = newScreens;
}
