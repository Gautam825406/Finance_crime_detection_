<p align="center">
  <img src="https://raw.githubusercontent.com/Gautam825406/Finance_crime_detection_/main/public/logo.png" alt="Project Logo" width="120" />
</p>

<h1 align="center">🚨 Graph-Based Financial Crime Detection Engine</h1>

<p align="center">
  <b>RIFT 2026 Hackathon — Graph Theory Track</b><br/>
  <b>Money Muling Detection Challenge</b><br/>
  <b>Team: ⚡ Stormbreakers ⚡</b>
</p>

<p align="center">
  <a href="https://finance-crime-detection.vercel.app/">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel">
  </a>
  <a href="https://github.com/Gautam825406/Finance_crime_detection_">
    <img alt="GitHub Repo" src="https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github">
  </a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-97%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Cytoscape" src="https://img.shields.io/badge/Cytoscape.js-Graph%20Viz-2C2C2C?style=for-the-badge">
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square">
  <img alt="PRs" src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square">
  <img alt="Processing" src="https://img.shields.io/badge/Processing%20Target-%E2%89%A430s%20for%2010K%20txns-blue?style=flat-square">
  <img alt="Precision" src="https://img.shields.io/badge/Precision-%E2%89%A570%25-success?style=flat-square">
  <img alt="Recall" src="https://img.shields.io/badge/Recall-%E2%89%A560%25-success?style=flat-square">
</p>

---

## 🔗 Links

| | |
|---|---|
| ✅ **Live App** | https://finance-crime-detection.vercel.app/ |
| 📂 **Repository** | https://github.com/Gautam825406/Finance_crime_detection_ |

---

## 🎯 Overview

Upload a transactions CSV → the engine builds a directed graph → detects money-muling rings (cycles, smurfing, layering) → highlights rings in an interactive graph → produces a strict-format JSON report for judge evaluation.

**Designed for:**
- Hidden datasets with fraud + legit trap patterns
- 10K transactions within the required time budget

---

## 📌 Problem Statement

Money muling is a critical component of financial crime where criminals use networks of individuals ("mules") to transfer and layer illicit funds through multiple accounts. Traditional database queries fail to detect sophisticated **multi-hop networks**.

This project builds a **web-based Financial Forensics Engine** that processes transaction data and exposes money muling networks using **graph analysis + visualization**.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📥 CSV Upload | Strict RIFT schema validation |
| 🕸️ Graph Construction | Directed money flow, adjacency list |
| 🔁 Cycle Detection | Detects cycles of length 3–5 |
| 🌪️ Smurfing Detection | Fan-in / fan-out within 72 hours |
| 🧅 Shell Detection | 3+ hops through low-degree intermediaries |
| 📊 Suspicion Scoring | 0–100 score with false-positive controls |
| 🎯 Fraud Ring Table | Summary of all detected rings |
| 📄 JSON Export | Exact-format downloadable report |
| ⚡ Adaptive Layout | Optimized graph rendering for 10K transactions |
| 🧭 Node Interactions | Click/hover shows account-level detail |

---

## 🛠️ Tech Stack

- **Next.js 14** + **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Cytoscape.js**
- In-memory graph processing (optimized for hackathon scale)

---

## 🧠 System Architecture

```
CSV Upload
    │
    ▼
Parsing & Validation (quoted CSV, timestamp + amount checks)
    │
    ▼
Graph Construction (adjacency list, nodes: accounts, edges: txns)
    │
    ▼
Pattern Detection ──────────────► Scoring Engine (0–100)
  • Cycles (3–5)                    false-positive controls
  • Smurfing (72h fan-in/out)       merchant + payroll suppression
  • Layered shells (3+ hops)
    │                                       │
    ▼                                       ▼
Interactive Graph UI              Downloadable JSON Report
(Cytoscape.js + ring highlighting) (fraud ring summary table)
```

---

## 📥 Input Specification (Strict RIFT Format)

The app accepts CSV files with the following exact columns:

| Column | Type | Description |
|---|---|---|
| `transaction_id` | String | Unique transaction identifier |
| `sender_id` | String | Sender account ID (node) |
| `receiver_id` | String | Receiver account ID (node) |
| `amount` | Float | Transaction amount |
| `timestamp` | DateTime | `YYYY-MM-DD HH:MM:SS` |

---

## 🔍 Detection Patterns

### 1) Circular Fund Routing (Cycles)

Detects cycles of length **3 to 5** where all accounts belong to the same suspected ring.

- **Approach:** Bounded DFS + canonical cycle deduplication
- **Complexity:** ~O(V + E) with depth ≤ 5

### 2) Smurfing (Fan-in / Fan-out within 72h)

- **Fan-in:** 10+ senders → 1 receiver within 72 hours
- **Fan-out:** 1 sender → 10+ receivers within 72 hours
- Adds velocity & redistribution signals

- **Approach:** Timestamp sorting + sliding time window
- **Complexity:** O(T log T)

### 3) Layered Shell Networks

Detects chains of **3+ hops** where intermediate accounts have only 2–3 total transactions (shell-like behavior), exposing multi-hop layering.

- **Approach:** Bounded DFS with shell ratio constraints + pruning
- **Complexity:** Bounded traversal with early exits

---

## 📊 Suspicion Score Methodology (0–100)

Weighted risk score per account based on detected patterns:

| Signal | Score Contribution |
|---|---:|
| Cycle participation | +35 |
| Fan-in (smurfing) | +30 |
| Fan-out (smurfing) | +30 |
| High velocity | +10 |
| Layered shell chain | +25 |

### False-Positive Controls

To avoid flagging legitimate accounts:

- **Merchants:** High volume + low variance amounts + not in cycles → score reduced
- **Payroll:** Periodic payments with consistent amounts to many receivers → score reduced

Final score is clamped to **0–100**, rounded to 1 decimal, and sorted descending in JSON output.

---

## 📤 Output Specification (RIFT-Compliant)

### ✅ 1) Interactive Graph Visualization
- All accounts rendered as nodes
- Directed edges represent money flow
- Rings highlighted; suspicious nodes visually distinct
- Click/hover reveals account-level detail

### ✅ 2) Downloadable JSON Report

```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_00123",
      "suspicion_score": 87.5,
      "detected_patterns": ["cycle_length_3", "high_velocity"],
      "ring_id": "RING_001"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "member_accounts": ["ACC_00123"],
      "pattern_type": "cycle",
      "risk_score": 95.3
    }
  ],
  "summary": {
    "total_accounts_analyzed": 500,
    "suspicious_accounts_flagged": 15,
    "fraud_rings_detected": 4,
    "processing_time_seconds": 2.31
  }
}
```

### ✅ 3) Fraud Ring Summary Table

Each row displays: Ring ID · Pattern Type · Member Count · Risk Score · Member Account IDs

---

## ⚡ Performance

**Target:** Upload → Results in **≤ 30 seconds** for 10K transactions.

Graph UI uses adaptive layout selection:

| Edge Count | Layout Used |
|---|---|
| ≤ 2,000 edges | `cose` (physics-based, natural clusters) |
| > 2,000 edges | `grid` (fast + stable) |

---

## 🚀 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Gautam825406/Finance_crime_detection_

# Navigate to project directory
cd Finance_crime_detection_

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## 🖥️ Usage

1. Open the [live app](https://finance-crime-detection.vercel.app/) or run locally
2. Upload a CSV file (must match RIFT strict format)
3. Click **Analyze**
4. Inspect results:
   - Graph visualization with highlighted fraud rings
   - Fraud ring summary table
5. Download the JSON report

---

## ✅ Hackathon Submission Checklist

- [x] Live deployed web app (public, no auth required)
- [x] CSV upload on homepage
- [x] Graph visualization with ring highlighting
- [x] JSON output in exact RIFT format
- [x] Fraud ring summary table
- [x] LinkedIn demo video (2–3 mins, tagged with RIFT + hashtags)

---

## ⚠️ Known Limitations

- In-memory processing only (no persistent database)
- Extremely dense graphs may appear visually cluttered
- Heuristics are tuned for hackathon dataset scale (~10K transactions)

---

<p align="center">
  Built with ❤️ by <b>Team Stormbreakers</b> for <b>RIFT 2026</b>
</p>
