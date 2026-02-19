# Graph-Based Financial Crime Detection Engine
## RIFT 2026 Hackathon – Graph Theory Track

### Local Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open http://localhost:3000
```

### Vercel Deployment Instructions

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel

# Option B: GitHub Integration
# 1. Push this repo to GitHub
# 2. Go to https://vercel.com/new
# 3. Import the GitHub repository
# 4. Framework Preset: Next.js (auto-detected)
# 5. Click Deploy
```

### CSV Format

Your CSV must have exactly these columns:

| Column | Type | Format |
|---|---|---|
| transaction_id | string | any |
| sender_id | string | any |
| receiver_id | string | any |
| amount | float | numeric |
| timestamp | string | YYYY-MM-DD HH:MM:SS |

### Features

- CSV upload with full validation
- In-memory directed graph construction
- Cycle detection (length 3–5) via depth-limited DFS
- Smurfing detection (fan-in/fan-out with rolling 72h window)
- Layered shell network detection (≥3 hops)
- Suspicion scoring model (0–100)
- Interactive Cytoscape.js graph visualization
- Downloadable JSON results
- Handles 10K+ transactions in ≤30 seconds
