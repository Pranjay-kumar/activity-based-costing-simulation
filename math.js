// Pure data and calculation functions — no DOM dependencies.
// Included by both index.html (runtime) and tests.html (testing).

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
    { id: "machine",     name: "Machine processing",  driver: "machine hours",   cost: 84000, standard: 3000, custom: 1050 },
    { id: "setups",      name: "Production setups",   driver: "setup runs",      cost: 72000, standard: 18,   custom: 72   },
    { id: "moves",       name: "Material handling",   driver: "material moves",  cost: 42000, standard: 40,   custom: 140  },
    { id: "inspection",  name: "Quality inspections", driver: "inspections",     cost: 54000, standard: 24,   custom: 96   }
  ]
};

const levels = [
  {
    id: "plantwide",
    label: "Level 1",
    title: "Plantwide Shortcut",
    short: "Plantwide",
    coach: "A plantwide rate spreads one big overhead bucket using one volume measure. First find the rate, then we can ask whether that shortcut is fair.",
    prompt: "Use the formula overhead rate = total overhead / total direct labor hours. What is the plantwide overhead rate?",
    type: "choice",
    reward: 120,
    correct: "33.60",
    facts: [
      { label: "Total overhead",    value: "$252,000" },
      { label: "Standard Kit DLH", value: "4,800" },
      { label: "Custom Kit DLH",   value: "2,700" },
      { label: "Total DLH",        value: "7,500" }
    ],
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
    facts: [
      { label: "Standard units",         value: "12,000" },
      { label: "Custom units",           value: "3,000" },
      { label: "Custom share of units",       value: "20%" },
      { label: "Custom share of setups",      value: "80%" },
      { label: "Custom share of moves",       value: "78%" },
      { label: "Custom share of inspections", value: "80%" }
    ],
    choices: [
      { id: "standard", label: "Standard Kit", note: "Standard is high volume and uses fewer batch activities per unit." },
      { id: "custom",   label: "Custom Kit",   note: "Custom is lower volume but uses many more setups, moves, and inspections." }
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
    facts: [
      { label: "Machine processing", value: "Caused by machine time" },
      { label: "Production setups",  value: "Caused by setup runs" },
      { label: "Material handling",  value: "Caused by moving materials" },
      { label: "Quality inspections",value: "Caused by inspection work" }
    ],
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
    facts: [
      { label: "Machine OH",      value: "$20.74 x 1,050 = $21,778" },
      { label: "Setup OH",        value: "$800 x 72 = $57,600" },
      { label: "Move OH",         value: "$233.33 x 140 = $32,667" },
      { label: "Inspection OH",   value: "$450 x 96 = $43,200" },
      { label: "Custom total OH", value: "$155,244" },
      { label: "Custom units",    value: "3,000" }
    ],
    choices: [
      { id: "8.06",  label: "$8.06",  note: "That is Standard Kit's ABC overhead per unit." },
      { id: "30.24", label: "$30.24", note: "That is Custom Kit's plantwide overhead, before ABC traces batch work." },
      { id: "51.75", label: "$51.75", note: "About $155,244 of activity overhead divided by 3,000 Custom Kits." }
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
    facts: [
      { label: "Current price",    value: "$89.00" },
      { label: "Direct cost",      value: "$42.00" },
      { label: "ABC overhead",     value: "$51.75" },
      { label: "ABC unit cost",    value: "$93.75" },
      { label: "Current unit profit", value: "-$4.75" },
      { label: "Discount proposal",   value: "$75.00" }
    ],
    choices: [
      { id: "discount", label: "Discount Custom Kit to $75", note: "That price is far below the ABC unit cost of $93.75." },
      { id: "hold",     label: "Keep price at $89",          note: "This still loses money under ABC because full cost is $93.75." },
      { id: "raise",    label: "Raise or redesign Custom Kit", note: "Correct. Either price for complexity or reduce the activities it consumes." }
    ],
    lesson: "ABC shows Custom Kit is already below full cost at $89. A discount would deepen the loss."
  }
];

const driverMatches = [
  { activity: "Machine processing",  driver: "machine hours",   wrong: "setup runs" },
  { activity: "Production setups",   driver: "setup runs",      wrong: "units produced" },
  { activity: "Material handling",   driver: "material moves",  wrong: "sales dollars" },
  { activity: "Quality inspections", driver: "inspections",     wrong: "direct labor hours" }
];

const productKeys = ["standard", "custom"];

// ─── Formatting helpers ───────────────────────────────────────────────────────

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

// ─── Core calculations ────────────────────────────────────────────────────────

function totalOverhead() {
  return caseData.activities.reduce((sum, a) => sum + a.cost, 0);
}

function directCost(product) {
  return product.directMaterials + product.directLabor;
}

function plantwideRate() {
  const totalDLH = productKeys.reduce((sum, key) => sum + caseData.products[key].directLaborHours, 0);
  return totalOverhead() / totalDLH;
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
