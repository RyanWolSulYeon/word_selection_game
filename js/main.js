import { onDataUpdate } from './data.js';
import { initManage, renderScreenList, renderScreenSelect, renderQuestionList } from './manage.js';
import { initGame, renderScreenPicker } from './game.js';

const tabButtons = document.querySelectorAll(".tab-btn");
const panels = {
  play: document.getElementById("tab-play"),
  manage: document.getElementById("tab-manage")
};

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    
    Object.keys(panels).forEach(k => panels[k].classList.remove("active"));
    panels[btn.dataset.tab].classList.add("active");
    
    if (btn.dataset.tab === "manage") {
      renderScreenList();
      renderScreenSelect();
      renderQuestionList();
    }
    if (btn.dataset.tab === "play") {
      renderScreenPicker();
    }
  });
});

onDataUpdate(() => {
  renderScreenList();
  renderScreenSelect();
  renderQuestionList();
  renderScreenPicker();
});

initManage();
initGame();
