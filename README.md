# Activity Cost Lab

A static, no-build activity-based costing game for managerial accounting classes. Students work through five scored levels inside a fictional two-product factory (TrailMix Co.), comparing plantwide overhead allocation with activity-based costing and making a real pricing decision.

## How to Play

1. Enter a student or team name and click **Start game**.
2. Work through each of the five levels in order. Locked levels unlock as you complete the previous one.
3. Pick an answer (or match all four drivers on Level 3). The game gives instant feedback and explains the accounting behind each answer.
4. Your **score** starts at the level's point value and drops by 35 points for each wrong attempt. A streak of two or more correct answers in a row adds a 25-point bonus. The minimum score per level is 40 points.
5. After finishing Level 5, click **Save score** to add your result to the local leaderboard.

Progress is saved automatically in the browser so you can close the tab and resume later. Click the reset button (↺) in the top-right to start over.

## The Five Levels

| # | Title | What you do |
|---|-------|-------------|
| 1 | **Plantwide Shortcut** | Calculate the single plantwide overhead rate ($252,000 ÷ 7,500 DLH). |
| 2 | **Spot The Distortion** | Identify which product is undercosted when one volume driver is used for all overhead. |
| 3 | **Build The Activity Map** | Match each of the four activity pools to the cost driver that best explains it. |
| 4 | **Reveal True Unit Cost** | Choose the correct ABC overhead per unit for Custom Kit (~$51.75). |
| 5 | **Final Pricing Decision** | Recommend whether to discount, hold, or raise the price of Custom Kit given its true ABC cost. |

## The TrailMix Co. Case

TrailMix Co. makes two products:

| | Standard Kit | Custom Kit |
|---|---|---|
| Units produced | 12,000 | 3,000 |
| Selling price | $48 | $89 |
| Direct cost per unit | $22 | $42 |
| Direct labor hours | 4,800 | 2,700 |

Total overhead is $252,000 split across four activity pools:

| Activity | Driver | Cost |
|----------|--------|------|
| Machine processing | Machine hours | $84,000 |
| Production setups | Setup runs | $72,000 |
| Material handling | Material moves | $42,000 |
| Quality inspections | Inspections | $54,000 |

Custom Kit consumes 80% of setups, 78% of moves, and 80% of inspections while representing only 20% of unit volume — the source of the cost distortion.

## Tech Stack

- Static HTML, CSS, and vanilla JavaScript — no build step, no package manager
- `math.js` holds all case data and pure calculation functions (no DOM dependencies)
- `script.js` holds all game state, rendering, and event handling
- Browser `localStorage` for leaderboard scores and session persistence
- GitHub Pages deployment via `.github/workflows/pages.yml`

## Running Locally

Open `index.html` directly in a browser. No server or install step is needed.

## Running the Tests

Open `tests.html` in a browser. It runs 24 unit tests covering:

- `totalOverhead()` — overhead pool sum
- `plantwideRate()` — single-rate calculation
- `activityRate()` — per-driver rate for each pool
- `traditionalFor()` — plantwide unit cost and margin for each product
- `abcFor()` — ABC unit cost, profit, and margin for each product
- Cost distortion direction (standard overcosted, custom undercosted)
- Full overhead allocation (ABC must allocate 100% of total overhead)
- `fmtMoney()` and `fmtPercent()` formatting helpers
- Driver data integrity

All tests run client-side with no framework. Results display as green/red rows with expected vs. actual values on failure.

## Hosting on GitHub Pages

1. Push the branch to GitHub.
2. In repository **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The included workflow publishes on every push to `main`, `master`, or any `codex/**` branch.

Alternatively, set Pages to deploy from the repository root — `index.html`, `math.js`, `script.js`, and `styles.css` must all be present.

## Leaderboard Notes

- Scores are stored in `localStorage` under the key `activity-cost-lab-leaderboard`. They are local to the browser and not shared across devices.
- The leaderboard keeps the top 12 scores. Saving a new score for a name that already exists replaces the old entry for that name.
- If storage is full or unavailable, the game will show an alert and continue without saving.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Page is blank after opening `index.html` | Make sure `math.js`, `script.js`, and `styles.css` are in the same folder as `index.html`. |
| Progress lost after refresh | Check that the browser allows `localStorage` (private/incognito mode may block it). |
| Leaderboard score missing | Only scores from completed games (all 5 levels) can be saved. |
| GitHub Pages not updating | Confirm the Pages source is set to **GitHub Actions**, not a branch. |
