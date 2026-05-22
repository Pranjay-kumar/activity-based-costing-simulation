const STORAGE_KEY = "activity-cost-lab-leaderboard";

const initialCase = {
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

const state = {
  student: "Guest analyst",
  activeStage: "plantwide",
  allocationBase: "directLaborHours",
  suspicion: null,
  diagnosis: null,
  scoreSaved: false,
  pricingTargets: {
    standard: 30,
    custom: 24
  },
  caseData: cloneCase(initialCase)
};

const productKeys = ["standard", "custom"];

const startForm = document.getElementById("start-form");
const studentName = document.getElementById("student-name");
const studentChip = document.getElementById("student-chip");
const baseSelect = document.getElementById("base-select");
const resetCaseButton = document.getElementById("reset-case");
const resetAssumptionsButton = document.getElementById("reset-assumptions");
const runRoundButton = document.getElementById("run-round");
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
  switchStage("plantwide");
});

baseSelect.addEventListener("change", () => {
  state.allocationBase = baseSelect.value;
  renderAll();
});

resetCaseButton.addEventListener("click", resetCase);
resetAssumptionsButton.addEventListener("click", resetCase);

runRoundButton.addEventListener("click", () => {
  switchStage("debrief");
});

saveScoreButton.addEventListener("click", () => {
  saveScore();
  renderLeaderboard();
});

clearBoardButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderLeaderboard();
});

document.querySelectorAll(".step-button").forEach((button) => {
  button.addEventListener("click", () => switchStage(button.dataset.stage));
});

document.querySelectorAll(".choice-button").forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.question;
    state[question] = button.dataset.choice;
    if (question === "diagnosis") {
      state.scoreSaved = false;
    }
    renderAll();
  });
});

function cloneCase(source) {
  return JSON.parse(JSON.stringify(source));
}

function resetCase() {
  state.caseData = cloneCase(initialCase);
  state.diagnosis = null;
  state.suspicion = null;
  state.scoreSaved = false;
  state.pricingTargets = { standard: 30, custom: 24 };
  renderAll();
}

function switchStage(stage) {
  state.activeStage = stage;
  document.querySelectorAll(".stage").forEach((section) => {
    section.classList.toggle("active", section.id === `stage-${stage}`);
  });
  document.querySelectorAll(".step-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.stage === stage);
  });
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  return state.caseData.activities.reduce((sum, activity) => sum + Number(activity.cost || 0), 0);
}

function directCost(product) {
  return Number(product.directMaterials) + Number(product.directLabor);
}

function plantwideRate() {
  const totalBase = productKeys.reduce((sum, key) => {
    return sum + Number(state.caseData.products[key][state.allocationBase] || 0);
  }, 0);
  return totalBase === 0 ? 0 : totalOverhead() / totalBase;
}

function traditionalFor(key) {
  const product = state.caseData.products[key];
  const basePerUnit = Number(product[state.allocationBase] || 0) / Number(product.units || 1);
  const overheadPerUnit = plantwideRate() * basePerUnit;
  const unitCost = directCost(product) + overheadPerUnit;
  const unitProfit = Number(product.price) - unitCost;
  return {
    overheadPerUnit,
    unitCost,
    unitProfit,
    margin: Number(product.price) === 0 ? 0 : unitProfit / Number(product.price)
  };
}

function activityRate(activity) {
  const totalUsage = Number(activity.standard || 0) + Number(activity.custom || 0);
  return totalUsage === 0 ? 0 : Number(activity.cost || 0) / totalUsage;
}

function abcFor(key) {
  const product = state.caseData.products[key];
  const allocated = state.caseData.activities.reduce((sum, activity) => {
    return sum + activityRate(activity) * Number(activity[key] || 0);
  }, 0);
  const overheadPerUnit = allocated / Number(product.units || 1);
  const unitCost = directCost(product) + overheadPerUnit;
  const unitProfit = Number(product.price) - unitCost;
  return {
    allocated,
    overheadPerUnit,
    unitCost,
    unitProfit,
    margin: Number(product.price) === 0 ? 0 : unitProfit / Number(product.price)
  };
}

function currentProfit() {
  return productKeys.reduce((sum, key) => {
    const product = state.caseData.products[key];
    return sum + abcFor(key).unitProfit * Number(product.units || 0);
  }, 0);
}

function recommendedPrice(key) {
  const target = state.pricingTargets[key] / 100;
  const unitCost = abcFor(key).unitCost;
  return target >= 0.95 ? unitCost : unitCost / (1 - target);
}

function projectedProfit() {
  return productKeys.reduce((sum, key) => {
    const product = state.caseData.products[key];
    return sum + (recommendedPrice(key) - abcFor(key).unitCost) * Number(product.units || 0);
  }, 0);
}

function undercostedProduct() {
  const distortions = productKeys.map((key) => {
    return {
      key,
      distortion: abcFor(key).overheadPerUnit - traditionalFor(key).overheadPerUnit
    };
  });
  distortions.sort((a, b) => b.distortion - a.distortion);
  return distortions[0].key;
}

function labScore() {
  const correctDiagnosis = state.diagnosis === undercostedProduct();
  const diagnosisPoints = correctDiagnosis ? 40 : 0;
  const gain = projectedProfit() - currentProfit();
  const pricingPoints = Math.max(0, Math.min(60, Math.round((gain / 90000) * 60)));
  return diagnosisPoints + pricingPoints;
}

function renderAll() {
  document.getElementById("start-overhead").textContent = fmtMoney(totalOverhead());
  renderPlantwideMetrics();
  renderTraditionalTable();
  renderActivityTable();
  renderAbcTable();
  renderChoiceButtons();
  renderDiagnosisFeedback();
  renderPricing();
  renderDebrief();
  renderLeaderboard();
}

function renderPlantwideMetrics() {
  const rate = plantwideRate();
  const totalUnits = productKeys.reduce((sum, key) => sum + Number(state.caseData.products[key].units || 0), 0);
  const baseLabel = state.allocationBase === "directLaborHours" ? "DLH" : "machine hr";
  const strongest = productKeys
    .map((key) => ({ key, margin: traditionalFor(key).margin }))
    .sort((a, b) => b.margin - a.margin)[0];

  document.getElementById("plantwide-metrics").innerHTML = [
    metricMarkup("Total overhead", fmtMoney(totalOverhead()), ""),
    metricMarkup("Plantwide rate", `${fmtMoney(rate, 2)} / ${baseLabel}`, ""),
    metricMarkup("Units in case", totalUnits.toLocaleString(), ""),
    metricMarkup("Best margin so far", state.caseData.products[strongest.key].label, "good")
  ].join("");
}

function metricMarkup(label, value, tone) {
  return `<div class="metric ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderTraditionalTable() {
  const tbody = document.querySelector("#traditional-table tbody");
  tbody.innerHTML = productKeys.map((key) => {
    const product = state.caseData.products[key];
    const result = traditionalFor(key);
    return `
      <tr>
        <td><strong>${product.label}</strong><br><span class="muted">${product.units.toLocaleString()} units</span></td>
        <td>${fmtMoney(product.price)}</td>
        <td>${fmtMoney(directCost(product))}</td>
        <td>${fmtMoney(result.overheadPerUnit, 2)}</td>
        <td>${fmtMoney(result.unitCost, 2)}</td>
        <td class="${result.margin >= 0 ? "positive" : "negative"}">${fmtPercent(result.margin)}</td>
      </tr>
    `;
  }).join("");
}

function renderActivityTable() {
  const tbody = document.querySelector("#activity-table tbody");
  tbody.innerHTML = state.caseData.activities.map((activity, index) => {
    return `
      <tr>
        <td><strong>${activity.name}</strong></td>
        <td>${activity.driver}</td>
        <td><input class="number-input compact activity-input" type="number" min="0" step="1000" value="${activity.cost}" data-index="${index}" data-field="cost" aria-label="${activity.name} pool cost"></td>
        <td><input class="number-input compact activity-input" type="number" min="0" step="1" value="${activity.standard}" data-index="${index}" data-field="standard" aria-label="${activity.name} standard usage"></td>
        <td><input class="number-input compact activity-input" type="number" min="0" step="1" value="${activity.custom}" data-index="${index}" data-field="custom" aria-label="${activity.name} custom usage"></td>
        <td>${fmtMoney(activityRate(activity), 2)}</td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll(".activity-input").forEach((input) => {
    input.addEventListener("change", () => {
      const activity = state.caseData.activities[Number(input.dataset.index)];
      activity[input.dataset.field] = Number(input.value || 0);
      state.scoreSaved = false;
      renderAll();
    });
  });
}

function renderAbcTable() {
  const tbody = document.querySelector("#abc-table tbody");
  tbody.innerHTML = productKeys.map((key) => {
    const product = state.caseData.products[key];
    const abc = abcFor(key);
    const traditional = traditionalFor(key);
    const distortion = traditional.overheadPerUnit - abc.overheadPerUnit;
    const aligned = Math.abs(distortion) < 0.005;
    const tagClass = aligned ? "" : distortion > 0 ? "alert" : "good";
    const tagText = aligned ? "Aligned with ABC" : distortion > 0 ? "Overcosted by plantwide" : "Undercosted by plantwide";
    return `
      <tr>
        <td><strong>${product.label}</strong><br><span class="muted">${product.units.toLocaleString()} units</span></td>
        <td>${fmtMoney(abc.overheadPerUnit, 2)}</td>
        <td>${fmtMoney(abc.unitCost, 2)}</td>
        <td class="${abc.margin >= 0 ? "positive" : "negative"}">${fmtPercent(abc.margin)}</td>
        <td><span class="tag ${tagClass}">${tagText}: ${fmtMoney(Math.abs(distortion), 2)}/unit</span></td>
      </tr>
    `;
  }).join("");
}

function renderChoiceButtons() {
  document.querySelectorAll(".choice-button").forEach((button) => {
    const question = button.dataset.question;
    const selected = state[question] === button.dataset.choice;
    button.classList.toggle("selected", selected);
    button.classList.remove("correct", "incorrect");
    if (question === "diagnosis" && selected) {
      button.classList.add(button.dataset.choice === undercostedProduct() ? "correct" : "incorrect");
    }
  });
}

function renderDiagnosisFeedback() {
  const feedback = document.getElementById("diagnosis-feedback");
  const correct = undercostedProduct();
  if (!state.diagnosis) {
    feedback.textContent = "Use the ABC table to compare plantwide overhead per unit against activity-based overhead per unit.";
    return;
  }
  const chosen = state.caseData.products[state.diagnosis].label;
  if (state.diagnosis === correct) {
    feedback.textContent = `${chosen} is undercosted because its activity usage is heavier than the plantwide rate shows.`;
  } else {
    feedback.textContent = `${chosen} is not the undercosted product in this case. Look for the product where ABC overhead per unit is higher than plantwide overhead per unit.`;
  }
}

function renderPricing() {
  document.getElementById("pricing-grid").innerHTML = productKeys.map((key) => {
    const product = state.caseData.products[key];
    const abc = abcFor(key);
    const target = state.pricingTargets[key];
    const nextPrice = recommendedPrice(key);
    return `
      <article class="pricing-card">
        <h3>${product.label}</h3>
        <div class="product-card">
          <div><span>Current price</span><strong>${fmtMoney(product.price)}</strong></div>
          <div><span>ABC unit cost</span><strong>${fmtMoney(abc.unitCost, 2)}</strong></div>
          <div><span>Current ABC margin</span><strong class="${abc.margin >= 0 ? "positive" : "negative"}">${fmtPercent(abc.margin)}</strong></div>
          <div><span>Annual volume</span><strong>${product.units.toLocaleString()}</strong></div>
        </div>
        <div class="slider-block">
          <div class="slider-row">
            <label for="target-${key}">Target margin</label>
            <strong>${target}%</strong>
          </div>
          <input id="target-${key}" type="range" min="5" max="45" step="1" value="${target}" data-price-key="${key}">
        </div>
        <div class="price-line">
          <span class="muted">Recommended ABC price</span>
          <strong>${fmtMoney(nextPrice, 2)}</strong>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-price-key]").forEach((input) => {
    input.addEventListener("change", () => {
      state.pricingTargets[input.dataset.priceKey] = Number(input.value);
      state.scoreSaved = false;
      renderAll();
    });
  });

  const profit = projectedProfit();
  const change = profit - currentProfit();
  document.getElementById("projected-profit").textContent = fmtMoney(profit);
  document.getElementById("projected-profit").className = profit >= 0 ? "positive" : "negative";
  document.getElementById("profit-change").textContent = fmtMoney(change);
  document.getElementById("profit-change").className = change >= 0 ? "positive" : "negative";
  document.getElementById("score-preview").textContent = String(labScore());
}

function renderDebrief() {
  const correct = undercostedProduct();
  const overcosted = productKeys.find((key) => key !== correct);
  const correctProduct = state.caseData.products[correct];
  const overProduct = state.caseData.products[overcosted];
  const customAbc = abcFor("custom");
  const standardAbc = abcFor("standard");

  document.getElementById("primary-insight").innerHTML = `
    <p class="eyebrow">Cost diagnosis</p>
    <h3>${correctProduct.label} was undercosted.</h3>
    <p>${correctProduct.label} absorbs more activity cost per unit than the plantwide rate assigned. ${overProduct.label} was carrying some of that overhead burden.</p>
  `;

  document.getElementById("pricing-insight").innerHTML = `
    <p class="eyebrow">Pricing implication</p>
    <h3>${customAbc.margin < standardAbc.margin ? "Complexity is expensive." : "Volume is carrying the case."}</h3>
    <p>At current prices, Standard Kit has an ABC margin of ${fmtPercent(standardAbc.margin)} and Custom Kit has an ABC margin of ${fmtPercent(customAbc.margin)}. The pricing round turns those unit economics into a projected profit of ${fmtMoney(projectedProfit())}.</p>
  `;
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveScore() {
  const entries = loadLeaderboard().filter((entry) => entry.name !== state.student);
  entries.push({
    name: state.student,
    score: labScore(),
    profit: projectedProfit(),
    diagnosis: state.diagnosis === undercostedProduct()
  });
  entries.sort((a, b) => b.score - a.score || b.profit - a.profit);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 12)));
  state.scoreSaved = true;
}

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const entries = loadLeaderboard();
  if (entries.length === 0) {
    list.innerHTML = `<div class="empty-state">No saved scores yet.</div>`;
    return;
  }
  list.innerHTML = entries.map((entry, index) => {
    const you = entry.name === state.student;
    return `
      <div class="leaderboard-row ${you ? "you" : ""}">
        <span class="rank">${index + 1}</span>
        <strong>${entry.name}${you ? " (you)" : ""}</strong>
        <strong>${entry.score} pts</strong>
        <span>${fmtMoney(entry.profit)} profit</span>
      </div>
    `;
  }).join("");
}

renderAll();
