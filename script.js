// math.js is loaded before this file and provides: caseData, levels,
// driverMatches, productKeys, and all pure calculation functions.

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY         = "activity-cost-lab-leaderboard";
const GAME_STATE_KEY      = "activity-cost-lab-state";
const MAX_LEADERBOARD     = 12;
const MIN_SCORE_FLOOR     = 40;
const PENALTY_PER_ATTEMPT = 35;
const STREAK_THRESHOLD    = 2;
const STREAK_BONUS        = 25;
const METER_MARGIN_SCALE  = 120;

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  student:      "Guest analyst",
  levelIndex:   0,
  score:        0,
  streak:       0,
  attempts:     {},
  answers:      {},
  matchAnswers: {},
  completed:    new Set(),
  showLesson:   false,
  started:      false
};

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveGameState() {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
      ...state,
      completed: [...state.completed]
    }));
  } catch (e) {
    // storage unavailable — progress won't survive a refresh
  }
}

function loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, {
      ...saved,
      completed: new Set(saved.completed || [])
    });
  } catch (e) {
    // corrupt data — start fresh
  }
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const startForm       = document.getElementById("start-form");
const studentNameInput = document.getElementById("student-name");
const studentChip     = document.getElementById("student-chip");
const resetCaseButton = document.getElementById("reset-case");
const saveScoreButton = document.getElementById("save-score");
const clearBoardButton = document.getElementById("clear-board");

// ─── One-time event setup ─────────────────────────────────────────────────────

function setupEventListeners() {
  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = studentNameInput.value.trim();
    if (name.length > 0) state.student = name;
    studentChip.textContent = state.student;
    state.started = true;
    document.getElementById("screen-start").classList.remove("active");
    document.getElementById("screen-lab").classList.add("active");
    saveGameState();
    renderAll();
  });

  resetCaseButton.addEventListener("click", resetGame);

  saveScoreButton.addEventListener("click", () => {
    if (saveScore()) renderLeaderboard();
  });

  clearBoardButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderLeaderboard();
  });

  // Level nav — single delegated listener on the persistent container
  document.getElementById("level-track").addEventListener("click", (e) => {
    const button = e.target.closest("[data-level-index]");
    if (!button || button.disabled) return;
    state.levelIndex = Number(button.dataset.levelIndex);
    state.showLesson = false;
    renderAll();
  });

  // Challenge answers — single delegated listener
  document.getElementById("challenge-body").addEventListener("click", (e) => {
    const choiceBtn = e.target.closest("[data-choice]");
    if (choiceBtn && !choiceBtn.disabled) {
      answerChoice(currentLevel().id, choiceBtn.dataset.choice);
      return;
    }
    const matchBtn = e.target.closest("[data-match-driver]");
    if (matchBtn && !matchBtn.disabled) {
      answerMatch(matchBtn.dataset.matchActivity, matchBtn.dataset.matchDriver);
    }
  });

  // Nav controls — single delegated listener
  document.getElementById("challenge-controls").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    if (btn.id === "btn-prev") {
      prevLevel();
    } else if (btn.id === "btn-next") {
      if (state.levelIndex === levels.length - 1) {
        document.getElementById("results-zone").scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        nextLevel();
      }
    }
  });
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function resetGame() {
  state.levelIndex   = 0;
  state.score        = 0;
  state.streak       = 0;
  state.attempts     = {};
  state.answers      = {};
  state.matchAnswers = {};
  state.completed    = new Set();
  state.showLesson   = false;
  saveGameState();
  renderAll();
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
  const attempts    = levelAttempts(level);
  const penalty     = Math.max(0, attempts - 1) * PENALTY_PER_ATTEMPT;
  const streakBonus = state.streak >= STREAK_THRESHOLD ? STREAK_BONUS : 0;
  const earned      = Math.max(MIN_SCORE_FLOOR, level.reward - penalty + streakBonus);
  state.score += earned;
  return earned;
}

function answerChoice(levelId, choiceId) {
  const level = levels.find((item) => item.id === levelId);
  if (!level || isLevelComplete(level)) return;
  state.attempts[level.id] = levelAttempts(level) + 1;
  state.answers[level.id]  = choiceId;
  if (choiceId === level.correct) {
    state.streak += 1;
    state.answers[`${level.id}-earned`] = awardPoints(level);
    state.completed.add(level.id);
  } else {
    state.streak = 0;
  }
  state.showLesson = true;
  saveGameState();
  renderAll();
}

function answerMatch(activity, driver) {
  const level = levels.find((item) => item.id === "drivers");
  if (isLevelComplete(level)) return;

  // First interaction initialises to 1, matching how choice levels count attempts
  // (choice levels always increment on click; match levels start at 1 on first pick)
  if (!state.attempts[level.id]) state.attempts[level.id] = 1;

  state.matchAnswers[activity] = driver;
  const correctDriver = driverMatches.find((m) => m.activity === activity).driver;

  if (driver !== correctDriver) {
    state.attempts[level.id] = levelAttempts(level) + 1;
    state.streak = 0;
  }

  const solved = driverMatches.every((m) => state.matchAnswers[m.activity] === m.driver);
  if (solved) {
    state.streak += 1;
    state.answers[`${level.id}-earned`] = awardPoints(level);
    state.completed.add(level.id);
  } else {
    state.answers[`${level.id}-partial`] = driver === correctDriver ? "correct" : "incorrect";
  }
  state.showLesson = true;
  saveGameState();
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

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderAll() {
  document.getElementById("start-overhead").textContent = fmtMoney(totalOverhead());
  saveScoreButton.disabled    = state.completed.size < levels.length;
  saveScoreButton.textContent = state.completed.size < levels.length ? "Finish to save" : "Save score";
  renderHud();
  renderLevelNav();
  renderCaseFile();
  renderChallenge();
  renderScorecard();
  renderCostCards();
  renderLeaderboard();
}

function renderCaseFile() {
  const body = document.getElementById("case-file-body");
  if (!body || body.dataset.rendered) return; // render once — data never changes
  body.dataset.rendered = "true";

  const p = caseData.products;

  body.innerHTML = `
    <p class="case-context">
      TrailMix Co. runs a two-product factory. Standard Kit is high-volume and simple;
      Custom Kit is low-volume but triggers far more batch-level activity.
      Total overhead: <strong>${fmtMoney(totalOverhead())}</strong>.
    </p>

    <p class="case-section-label">Products</p>
    <table class="case-table">
      <thead>
        <tr>
          <th></th>
          <th>Standard Kit</th>
          <th>Custom Kit</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Units</td>
            <td>${p.standard.units.toLocaleString()}</td>
            <td>${p.custom.units.toLocaleString()}</td></tr>
        <tr><td>Selling price</td>
            <td>${fmtMoney(p.standard.price)}</td>
            <td>${fmtMoney(p.custom.price)}</td></tr>
        <tr><td>Direct materials</td>
            <td>${fmtMoney(p.standard.directMaterials)}</td>
            <td>${fmtMoney(p.custom.directMaterials)}</td></tr>
        <tr><td>Direct labor</td>
            <td>${fmtMoney(p.standard.directLabor)}</td>
            <td>${fmtMoney(p.custom.directLabor)}</td></tr>
        <tr><td>Direct labor hours</td>
            <td>${p.standard.directLaborHours.toLocaleString()}</td>
            <td>${p.custom.directLaborHours.toLocaleString()}</td></tr>
        <tr><td>Machine hours</td>
            <td>${p.standard.machineHours.toLocaleString()}</td>
            <td>${p.custom.machineHours.toLocaleString()}</td></tr>
      </tbody>
    </table>

    <p class="case-section-label">Activity pools</p>
    <table class="case-table">
      <thead>
        <tr>
          <th>Activity</th>
          <th>Driver</th>
          <th>Pool cost</th>
          <th>Std.</th>
          <th>Cust.</th>
        </tr>
      </thead>
      <tbody>
        ${caseData.activities.map((a) => `
          <tr>
            <td>${a.name}</td>
            <td>${a.driver}</td>
            <td>${fmtMoney(a.cost)}</td>
            <td>${a.standard.toLocaleString()}</td>
            <td>${a.custom.toLocaleString()}</td>
          </tr>
        `).join("")}
        <tr class="case-table-total">
          <td colspan="2">Total overhead</td>
          <td>${fmtMoney(totalOverhead())}</td>
          <td></td><td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderHud() {
  document.getElementById("hud-score").textContent  = state.score.toLocaleString();
  document.getElementById("hud-streak").textContent = `${state.streak}x`;
  document.getElementById("hud-level").textContent  = `${state.levelIndex + 1}/${levels.length}`;
  document.getElementById("progress-fill").style.width = `${(state.completed.size / levels.length) * 100}%`;
}

function renderLevelNav() {
  const nav = document.getElementById("level-track");
  nav.innerHTML = levels.map((level, index) => {
    const locked   = index > state.completed.size;
    const active   = index === state.levelIndex;
    const complete = state.completed.has(level.id);
    return `
      <button class="level-token ${active ? "active" : ""} ${complete ? "complete" : ""}"
              type="button" data-level-index="${index}" ${locked ? "disabled" : ""}>
        <span>${level.label}</span>
        <strong>${level.short}</strong>
      </button>
    `;
  }).join("");
}

function renderChallenge() {
  const level = currentLevel();
  document.getElementById("coach-text").textContent       = level.coach;
  document.getElementById("challenge-kicker").textContent = level.label;
  document.getElementById("challenge-title").textContent  = level.title;
  document.getElementById("challenge-prompt").textContent = level.prompt;

  document.getElementById("challenge-body").innerHTML =
    level.type === "match" ? renderMatchLevel(level) : renderChoiceLevel(level);

  renderFeedback(level);
  renderControls(level);
}

function renderChoiceLevel(level) {
  const selected = state.answers[level.id];
  const complete  = isLevelComplete(level);
  return `
    ${renderFacts(level)}
    <div class="answer-grid">
      ${level.choices.map((choice) => {
        const picked  = selected === choice.id;
        const correct = choice.id === level.correct;
        const tone    = picked ? (correct ? "correct" : "incorrect") : "";
        return `
          <button class="answer-card ${tone}" type="button"
                  data-choice="${choice.id}" ${complete ? "disabled" : ""}>
            <strong>${choice.label}</strong>
            <span>${picked ? choice.note : "Pick this answer"}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderFacts(level) {
  if (!level.facts) return "";
  return `
    <div class="clue-grid" aria-label="Case clues">
      ${level.facts.map((fact) => `
        <div class="clue-card">
          <span>${fact.label}</span>
          <strong>${fact.value}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMatchLevel(level) {
  const complete = isLevelComplete(level);
  return `
    ${renderFacts(level)}
    <div class="match-board">
      ${driverMatches.map((match) => {
        const selected = state.matchAnswers[match.activity];
        const answered = Boolean(selected);
        const correct  = selected === match.driver;
        return `
          <article class="match-row ${answered ? (correct ? "correct" : "incorrect") : ""}">
            <div>
              <span>Activity pool</span>
              <strong>${match.activity}</strong>
            </div>
            <div class="match-options">
              ${[match.driver, match.wrong].sort().map((driver) => `
                <button type="button"
                        data-match-activity="${match.activity}"
                        data-match-driver="${driver}"
                        ${complete ? "disabled" : ""}>
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
  const panel    = document.getElementById("feedback-panel");
  const complete  = isLevelComplete(level);
  const attempts  = levelAttempts(level);

  if (!state.showLesson && attempts === 0 && !state.answers[`${level.id}-partial`]) {
    panel.className = "feedback-panel";
    panel.innerHTML = `
      <p class="eyebrow">How to think</p>
      <h3>Make a call, then the game explains the accounting.</h3>
      <p>You can miss once and keep playing. Points fall a little after each attempt, so accuracy matters.</p>
    `;
    return;
  }

  const selected   = state.answers[level.id];
  let correct      = complete;
  let note         = level.lesson;
  let eyebrow      = correct ? "Correct" : "Try again";
  let headline     = correct
    ? `You earned ${state.answers[`${level.id}-earned`] || 0} points.`
    : "That answer does not fit the cost story yet.";
  let panelTone    = correct ? "correct" : "incorrect";

  if (level.type === "choice" && selected) {
    const choice = level.choices.find((item) => item.id === selected);
    correct      = selected === level.correct;
    note         = choice.note;
  }

  if (level.type === "match" && !complete) {
    const partial = state.answers[`${level.id}-partial`];
    if (partial === "correct") {
      eyebrow   = "Good match";
      headline  = "Keep going. That driver fits the activity.";
      note      = "Match the remaining activity pools. The level completes when all four drivers are right.";
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
  const complete  = isLevelComplete(level);
  const isLast    = state.levelIndex === levels.length - 1;
  controls.innerHTML = `
    <button class="secondary-button" type="button" id="btn-prev"
            ${state.levelIndex === 0 ? "disabled" : ""}>Back</button>
    <button class="primary-button" type="button" id="btn-next"
            ${complete ? "" : "disabled"}>${isLast ? "See results" : "Next level"}</button>
  `;
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
    const product     = caseData.products[key];
    const traditional = traditionalFor(key);
    const abc         = abcFor(key);
    const reveal      = state.completed.has("abc");
    const distortion  = traditional.overheadPerUnit - abc.overheadPerUnit;
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
          <span style="width:${Math.min(100, traditional.margin * METER_MARGIN_SCALE)}%"></span>
        </div>
        <dl>
          <div><dt>Plantwide unit cost</dt><dd>${fmtMoney(traditional.unitCost, 2)}</dd></div>
          <div><dt>ABC unit cost</dt><dd>${reveal ? fmtMoney(abc.unitCost, 2) : "Locked"}</dd></div>
          <div><dt>Distortion</dt>
               <dd class="${distortion > 0 ? "positive" : "negative"}">
                 ${reveal ? fmtMoney(Math.abs(distortion), 2) : "Locked"}
               </dd></div>
        </dl>
      </article>
    `;
  }).join("");
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveScore() {
  if (state.completed.size < levels.length) return false;
  try {
    const entries = loadLeaderboard().filter((entry) => entry.name !== state.student);
    entries.push({
      name:      state.student,
      score:     state.score,
      completed: state.completed.size,
      date:      new Date().toISOString()
    });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD)));
    return true;
  } catch (e) {
    alert("Score could not be saved — storage may be full or unavailable.");
    return false;
  }
}

function renderLeaderboard() {
  const list    = document.getElementById("leaderboard-list");
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

// ─── Init ─────────────────────────────────────────────────────────────────────

loadGameState();
setupEventListeners();

if (state.started) {
  studentChip.textContent = state.student;
  if (state.student !== "Guest analyst") studentNameInput.value = state.student;
  document.getElementById("screen-start").classList.remove("active");
  document.getElementById("screen-lab").classList.add("active");
}

renderAll();
