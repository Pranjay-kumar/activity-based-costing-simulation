const STORAGE_KEY = "activity-cost-lab-leaderboard";

const caseData = {
  products: {
    standard: {
      label: "Standard Kit",
      units: 12000,
      price: 48,
      directMaterials: 14,
      directLabor: 8,
      directLaborHours: 4800,
      machineHours: 3000
    },
    custom: {
      label: "Custom Kit",
      units: 3000,
      price: 89,
      directMaterials: 24,
      directLabor: 18,
      directLaborHours: 2700,
      machineHours: 1050
    }
  },
  activities: [
    { id: "machine", name: "Machine processing", driver: "machine hours", cost: 84000, standard: 3000, custom: 1050 },
    { id: "setups", name: "Production setups", driver: "setup runs", cost: 72000, standard: 18, custom: 72 },
    { id: "moves", name: "Material handling", driver: "material moves", cost: 42000, standard: 40, custom: 140 },
    { id: "inspection", name: "Quality inspections", driver: "inspections", cost: 54000, standard: 24, custom: 96 }
  ]
};

const levels = [
  {
    id: "plantwide",
    label: "Level 1",
    title: "Plantwide Shortcut",
    short: "Plantwide",
    coach: "A plantwide rate spreads one big overhead bucket using one volume measure. It is fast, but it can hide complexity.",
    prompt: "The controller starts with direct labor hours. What is the plantwide overhead rate?",
    type: "choice",
    reward: 120,
    correct: "33.60",
    choices: [
      { id: "16.80", label: "$16.80 per DLH", note: "That would only allocate half of the overhead." },
      { id: "33.60", label: "$33.60 per DLH", note: "$252,000 overhead divided by 7,500 direct labor hours." },
      { id: "62.22", label: "$62.22 per DLH", note: "That uses machine hours, not direct labor hours." }
    ],
    lesson: "Plantwide rate = total overhead / total allocation base. Here, $252,000 / 7,500 DLH = $33.60 per DLH."
  },
  {
    id: "distortion",
    label: "Level 2",
    title: "Spot The Distortion",
    short: "Distortion",
    coach: "When a low-volume product needs lots of setups, moves, or inspections, volume-based costing often makes it look cheaper than it really is.",
    prompt: "Under plantwide costing, which product is most likely being undercosted?",
    type: "choice",
    reward: 140,
    correct: "custom",
    choices: [
      { id: "standard", label: "Standard Kit", note: "Standard is high volume and uses fewer batch activities per unit." },
      { id: "custom", label: "Custom Kit", note: "Custom is lower volume but uses many more setups, moves, and inspections." }
    ],
    lesson: "Custom Kit uses 80% of setups, 78% of moves, and 80% of inspections while making only 20% of units."
  },
  {
    id: "drivers",
    label: "Level 3",
    title: "Build The Activity Map",
    short: "Drivers",
    coach: "ABC improves the model by splitting overhead into activity pools and assigning each pool with its own driver.",
    prompt: "Match each activity pool to the driver that best explains its cost.",
    type: "match",
    reward: 180,
    lesson: "A good driver is the thing that causes the activity cost. Setups are driven by setup runs, not units produced."
  },
  {
    id: "abc",
    label: "Level 4",
    title: "Reveal True Unit Cost",
    short: "ABC Math",
    coach: "Now the activity pools are traced to each product. The custom product absorbs more overhead per unit because it consumes more batch-level work.",
    prompt: "What is the ABC overhead per unit for Custom Kit?",
    type: "choice",
    reward: 180,
    correct: "51.75",
    choices: [
      { id: "8.06", label: "$8.06", note: "That is Standard Kit's ABC overhead per unit." },
      { id: "30.24", label: "$30.24", note: "That is Custom Kit's plantwide overhead, before ABC traces batch work." },
      { id: "51.75", label: "$51.75", note: "$155,250 of activity overhead divided by 3,000 Custom Kits." }
    ],
    lesson: "Custom Kit's ABC unit cost is $93.75: $42 direct cost plus $51.75 overhead."
  },
  {
    id: "pricing",
    label: "Level 5",
    title: "Final Pricing Decision",
    short: "Pricing",
    coach: "Your final move is a managerial decision. ABC does not make the decision for you, but it gives a cleaner view of product economics.",
    prompt: "The sales team wants to discount Custom Kit to win orders. What should you recommend?",
    type: "choice",
    reward: 220,
    correct: "raise",
    choices: [
      { id: "discount", label: "Discount Custom Kit to $75", note: "That price is far below the ABC unit cost of $93.75." },
      { id: "hold", label: "Keep price at $89", note: "This still loses money under ABC because full cost is $93.75." },
      { id: "raise", label: "Raise or redesign Custom Kit", note: "Correct. Either price for complexity or reduce the activities it consumes." }
    ],
    lesson: "ABC shows Custom Kit is already below full cost at $89. A discount would deepen the loss."
  }
];

const driverMatches = [
  { activity: "Machine processing", driver: "machine hours", wrong: "setup runs" },
  { activity: "Production setups", driver: "setup runs", wrong: "units produced" },
  { activity: "Material handling", driver: "material moves", wrong: "sales dollars" },
  { activity: "Quality inspections", driver: "inspections", wrong: "direct labor hours" }
];

const state = {
  student: "Guest analyst",
  levelIndex: 0,
  score: 0,
  streak: 0,
  attempts: {},
  answers: {},
  matchAnswers: {},
  completed: new Set(),
  showLesson: false
};

const productKeys = ["standard", "custom"];

const startForm = document.getElementById("start-form");
const studentName = document.getElementById("student-name");
const studentChip = document.getElementById("student-chip");
const resetCaseButton = document.getElementById("reset-case");
const saveScoreButton = document.getElementById("save-score");
const clearBoardButton = document.getElementById("clear-board");

startForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = studentName.value.trim();
  if (name.length > 0) {
    state.student = name;
  }
  studentChip.textContent = state.student;
  document.getElementById("screen-start").classList.remove("active");
  document.getElementById("screen-lab").classList.add("active");
  renderAll();
});

resetCaseButton.addEventListener("click", resetGame);
saveScoreButton.addEventListener("click", () => {
  saveScore();
  renderLeaderboard();
});
clearBoardButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderLeaderboard();
});

function resetGame() {
  state.levelIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.attempts = {};
  state.answers = {};
  state.matchAnswers = {};
  state.completed = new Set();
  state.showLesson = false;
  renderAll();
}

function fmtMoney(value, digits = 0) {
  const rounded = Number(value.toFixed(digits));
  const prefix = rounded < 0 ? "-$" : "$";
  return prefix + Math.abs(rounded).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function fmtPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function totalOverhead() {
  return caseData.activities.reduce((sum, activity) => sum + activity.cost, 0);
}

function directCost(product) {
  return product.directMaterials + product.directLabor;
}

function plantwideRate() {
  const totalDirectLaborHours = productKeys.reduce((sum, key) => sum + caseData.products[key].directLaborHours, 0);
  return totalOverhead() / totalDirectLaborHours;
}

function traditionalFor(key) {
  const product = caseData.products[key];
  const overheadPerUnit = plantwideRate() * (product.directLaborHours / product.units);
  const unitCost = directCost(product) + overheadPerUnit;
  const unitProfit = product.price - unitCost;
  return {
    overheadPerUnit,
    unitCost,
    unitProfit,
    margin: unitProfit / product.price
  };
}

function activityRate(activity) {
  return activity.cost / (activity.standard + activity.custom);
}

function abcFor(key) {
  const product = caseData.products[key];
  const allocated = caseData.activities.reduce((sum, activity) => {
    return sum + activityRate(activity) * activity[key];
  }, 0);
  const overheadPerUnit = allocated / product.units;
  const unitCost = directCost(product) + overheadPerUnit;
  const unitProfit = product.price - unitCost;
  return {
    allocated,
    overheadPerUnit,
    unitCost,
    unitProfit,
    margin: unitProfit / product.price
  };
}

function currentLevel() {
  return levels[state.levelIndex];
}

function isLevelComplete(level = currentLevel()) {
  return state.completed.has(level.id);
}

function levelAttempts(level = currentLevel()) {
  return state.attempts[level.id] || 0;
}

function awardPoints(level) {
  const attempts = levelAttempts(level);
  const penalty = Math.max(0, attempts - 1) * 35;
  const streakBonus = state.streak >= 2 ? 25 : 0;
  const earned = Math.max(40, level.reward - penalty + streakBonus);
  state.score += earned;
  return earned;
}

function answerChoice(levelId, choiceId) {
  const level = levels.find((item) => item.id === levelId);
  if (!level || isLevelComplete(level)) {
    return;
  }
  state.attempts[level.id] = levelAttempts(level) + 1;
  state.answers[level.id] = choiceId;
  const correct = choiceId === level.correct;
  if (correct) {
    state.streak += 1;
    const earned = awardPoints(level);
    state.completed.add(level.id);
    state.showLesson = true;
    state.answers[`${level.id}-earned`] = earned;
  } else {
    state.streak = 0;
    state.showLesson = true;
  }
  renderAll();
}

function answerMatch(activity, driver) {
  const level = levels.find((item) => item.id === "drivers");
  if (isLevelComplete(level)) {
    return;
  }
  state.matchAnswers[activity] = driver;
  const correctDriver = driverMatches.find((match) => match.activity === activity).driver;
  if (driver !== correctDriver) {
    state.attempts[level.id] = levelAttempts(level) + 1;
    state.streak = 0;
  }
  const solved = driverMatches.every((match) => state.matchAnswers[match.activity] === match.driver);
  if (solved) {
    state.streak += 1;
    const earned = awardPoints(level);
    state.completed.add(level.id);
    state.answers[`${level.id}-earned`] = earned;
    state.showLesson = true;
  } else {
    state.answers[`${level.id}-partial`] = driver === correctDriver ? "correct" : "incorrect";
    state.showLesson = true;
  }
  renderAll();
}

function nextLevel() {
  if (state.levelIndex < levels.length - 1) {
    state.levelIndex += 1;
    state.showLesson = false;
  }
  renderAll();
}

function prevLevel() {
  if (state.levelIndex > 0) {
    state.levelIndex -= 1;
    state.showLesson = false;
  }
  renderAll();
}

function renderAll() {
  document.getElementById("start-overhead").textContent = fmtMoney(totalOverhead());
  saveScoreButton.disabled = state.completed.size < levels.length;
  saveScoreButton.textContent = state.completed.size < levels.length ? "Finish to save" : "Save score";
  renderHud();
  renderLevelNav();
  renderChallenge();
  renderScorecard();
  renderCostCards();
  renderLeaderboard();
}

function renderHud() {
  document.getElementById("hud-score").textContent = state.score.toLocaleString();
  document.getElementById("hud-streak").textContent = `${state.streak}x`;
  document.getElementById("hud-level").textContent = `${state.levelIndex + 1}/${levels.length}`;
  document.getElementById("progress-fill").style.width = `${(state.completed.size / levels.length) * 100}%`;
}

function renderLevelNav() {
  const nav = document.getElementById("level-track");
  nav.innerHTML = levels.map((level, index) => {
    const locked = index > state.completed.size;
    const active = index === state.levelIndex;
    const complete = state.completed.has(level.id);
    return `
      <button class="level-token ${active ? "active" : ""} ${complete ? "complete" : ""}" type="button" data-level-index="${index}" ${locked ? "disabled" : ""}>
        <span>${level.label}</span>
        <strong>${level.short}</strong>
      </button>
    `;
  }).join("");
  nav.querySelectorAll("[data-level-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.levelIndex = Number(button.dataset.levelIndex);
      state.showLesson = false;
      renderAll();
    });
  });
}

function renderChallenge() {
  const level = currentLevel();
  document.getElementById("coach-text").textContent = level.coach;
  document.getElementById("challenge-kicker").textContent = level.label;
  document.getElementById("challenge-title").textContent = level.title;
  document.getElementById("challenge-prompt").textContent = level.prompt;

  const body = document.getElementById("challenge-body");
  body.innerHTML = level.type === "match" ? renderMatchLevel(level) : renderChoiceLevel(level);
  body.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => answerChoice(level.id, button.dataset.choice));
  });
  body.querySelectorAll("[data-match-driver]").forEach((button) => {
    button.addEventListener("click", () => answerMatch(button.dataset.matchActivity, button.dataset.matchDriver));
  });

  renderFeedback(level);
  renderControls(level);
}

function renderChoiceLevel(level) {
  const selected = state.answers[level.id];
  const complete = isLevelComplete(level);
  return `
    <div class="answer-grid">
      ${level.choices.map((choice) => {
        const picked = selected === choice.id;
        const correct = choice.id === level.correct;
        const tone = picked ? correct ? "correct" : "incorrect" : "";
        return `
          <button class="answer-card ${tone}" type="button" data-choice="${choice.id}" ${complete ? "disabled" : ""}>
            <strong>${choice.label}</strong>
            <span>${picked ? choice.note : "Pick this answer"}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderMatchLevel(level) {
  const complete = isLevelComplete(level);
  return `
    <div class="match-board">
      ${driverMatches.map((match) => {
        const selected = state.matchAnswers[match.activity];
        const answered = Boolean(selected);
        const correct = selected === match.driver;
        return `
          <article class="match-row ${answered ? correct ? "correct" : "incorrect" : ""}">
            <div>
              <span>Activity pool</span>
              <strong>${match.activity}</strong>
            </div>
            <div class="match-options">
              ${[match.driver, match.wrong].sort().map((driver) => `
                <button type="button" data-match-activity="${match.activity}" data-match-driver="${driver}" ${complete ? "disabled" : ""}>
                  ${driver}
                </button>
              `).join("")}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderFeedback(level) {
  const panel = document.getElementById("feedback-panel");
  const complete = isLevelComplete(level);
  const attempts = levelAttempts(level);
  if (!state.showLesson && attempts === 0 && !state.answers[`${level.id}-partial`]) {
    panel.className = "feedback-panel";
    panel.innerHTML = `
      <p class="eyebrow">How to think</p>
      <h3>Make a call, then the game explains the accounting.</h3>
      <p>You can miss once and keep playing. Points fall a little after each attempt, so accuracy matters.</p>
    `;
    return;
  }

  const selected = state.answers[level.id];
  let correct = complete;
  let note = level.lesson;
  let eyebrow = correct ? "Correct" : "Try again";
  let headline = correct ? `You earned ${state.answers[`${level.id}-earned`] || 0} points.` : "That answer does not fit the cost story yet.";
  let panelTone = correct ? "correct" : "incorrect";
  if (level.type === "choice" && selected) {
    const choice = level.choices.find((item) => item.id === selected);
    correct = selected === level.correct;
    note = choice.note;
  }
  if (level.type === "match" && !complete) {
    const partial = state.answers[`${level.id}-partial`];
    if (partial === "correct") {
      eyebrow = "Good match";
      headline = "Keep going. That driver fits the activity.";
      note = "Match the remaining activity pools. The level completes when all four drivers are right.";
      panelTone = "correct";
    }
  }

  panel.className = `feedback-panel ${panelTone}`;
  panel.innerHTML = `
    <p class="eyebrow">${eyebrow}</p>
    <h3>${headline}</h3>
    <p>${note}</p>
    ${correct && note !== level.lesson ? `<p class="lesson-line">${level.lesson}</p>` : ""}
  `;
}

function renderControls(level) {
  const controls = document.getElementById("challenge-controls");
  const complete = isLevelComplete(level);
  const isLast = state.levelIndex === levels.length - 1;
  controls.innerHTML = `
    <button class="secondary-button" type="button" id="btn-prev" ${state.levelIndex === 0 ? "disabled" : ""}>Back</button>
    <button class="primary-button" type="button" id="btn-next" ${complete ? "" : "disabled"}>${isLast ? "See results" : "Next level"}</button>
  `;
  document.getElementById("btn-prev").addEventListener("click", prevLevel);
  document.getElementById("btn-next").addEventListener("click", () => {
    if (isLast) {
      document.getElementById("results-zone").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    nextLevel();
  });
}

function renderScorecard() {
  const diagnosis = state.completed.has("distortion") ? "Custom Kit undercosted" : "Locked";
  const abc = abcFor("custom");
  const old = traditionalFor("custom");
  document.getElementById("scorecard").innerHTML = `
    <div><span>Diagnosis</span><strong>${diagnosis}</strong></div>
    <div><span>Custom plantwide OH</span><strong>${fmtMoney(old.overheadPerUnit, 2)}</strong></div>
    <div><span>Custom ABC OH</span><strong>${state.completed.has("abc") ? fmtMoney(abc.overheadPerUnit, 2) : "???"}</strong></div>
    <div><span>Custom ABC margin</span><strong>${state.completed.has("pricing") ? fmtPercent(abc.margin) : "???"}</strong></div>
  `;
}

function renderCostCards() {
  const container = document.getElementById("cost-cards");
  container.innerHTML = productKeys.map((key) => {
    const product = caseData.products[key];
    const traditional = traditionalFor(key);
    const abc = abcFor(key);
    const reveal = state.completed.has("abc");
    const distortion = traditional.overheadPerUnit - abc.overheadPerUnit;
    return `
      <article class="cost-card ${key}">
        <div class="cost-card-head">
          <div>
            <span>${product.units.toLocaleString()} units</span>
            <h3>${product.label}</h3>
          </div>
          <strong>${fmtMoney(product.price)}</strong>
        </div>
        <div class="cost-meter">
          <span style="width:${Math.min(100, traditional.margin * 120)}%"></span>
        </div>
        <dl>
          <div><dt>Plantwide unit cost</dt><dd>${fmtMoney(traditional.unitCost, 2)}</dd></div>
          <div><dt>ABC unit cost</dt><dd>${reveal ? fmtMoney(abc.unitCost, 2) : "Locked"}</dd></div>
          <div><dt>Distortion</dt><dd class="${distortion > 0 ? "positive" : "negative"}">${reveal ? fmtMoney(Math.abs(distortion), 2) : "Locked"}</dd></div>
        </dl>
      </article>
    `;
  }).join("");
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveScore() {
  if (state.completed.size < levels.length) {
    return;
  }
  const entries = loadLeaderboard().filter((entry) => entry.name !== state.student);
  entries.push({
    name: state.student,
    score: state.score,
    completed: state.completed.size,
    date: new Date().toISOString()
  });
  entries.sort((a, b) => b.score - a.score);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 12)));
}

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const entries = loadLeaderboard();
  if (entries.length === 0) {
    const message = state.completed.size < levels.length
      ? "Finish all five levels to save a final score."
      : `Ready to save ${state.score.toLocaleString()} points.`;
    list.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }
  list.innerHTML = entries.map((entry, index) => {
    const you = entry.name === state.student;
    return `
      <div class="leaderboard-row ${you ? "you" : ""}">
        <span class="rank">${index + 1}</span>
        <strong>${entry.name}${you ? " (you)" : ""}</strong>
        <strong>${entry.score} pts</strong>
        <span>${entry.completed}/5 levels</span>
      </div>
    `;
  }).join("");
}

window.answerChoice = answerChoice;
window.answerMatch = answerMatch;

renderAll();
