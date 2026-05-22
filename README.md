# Activity Cost Lab

A static activity-based costing simulation for a managerial accounting class. Students compare plantwide overhead allocation with activity-based costing, diagnose cost distortion, make a pricing decision, and save a local leaderboard score.

## Tech Stack

- Static HTML, CSS, and vanilla JavaScript
- No build step and no package manager required
- Browser `localStorage` for local leaderboard data
- GitHub Pages deployment workflow in `.github/workflows/pages.yml`

The reference site at `sterncashandcarry.netlify.app` uses the same basic architecture: a single static HTML app with embedded styling and JavaScript, Google Fonts, client-side state, and Netlify hosting.

## Run Locally

Open `index.html` in a browser. Because the app has no build step, GitHub Pages can serve these files directly.

## Host On GitHub Pages

1. Push this branch to GitHub.
2. In the repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. The included workflow will publish the static files on every push to `main`, `master`, or any `codex/**` branch.

If you prefer the simpler branch source flow, set Pages to deploy from the repository root and make sure `index.html`, `styles.css`, and `script.js` are present at the root.
