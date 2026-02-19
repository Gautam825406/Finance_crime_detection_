<!-- =========================
     RIFT 2026 — README.md
     Visually enhanced with badges + SVG architecture diagram
     Team: Stormbreakers
     ========================= -->

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
  <a href="https://finance-crime-detection.vercel.app/"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel"></a>
  <a href="https://github.com/Gautam825406/Finance_crime_detection_"><img alt="GitHub Repo" src="https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github"></a>
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

- ✅ **Live App:** https://finance-crime-detection.vercel.app/  
- 📂 **Repository:** https://github.com/Gautam825406/Finance_crime_detection_  

---

## 🎯 What this project does (1-minute view)

Upload a transactions CSV → the engine builds a directed graph → detects money-muling rings (cycles, smurfing, layering) → highlights rings in an interactive graph → produces a strict-format JSON report for judge evaluation.

**Designed for:**
- Hidden datasets with fraud + legit trap patterns  
- 10K transactions within the required time budget  

---

## 📌 Problem Overview

Money muling is a critical component of financial crime where criminals use networks of individuals (“mules”) to transfer and layer illicit funds through multiple accounts. Traditional database queries fail to detect sophisticated **multi-hop networks**.

This project builds a **web-based Financial Forensics Engine** that processes transaction data and exposes money muling networks using **graph analysis + visualization**.

---

## ✨ Key Features

- 📥 **CSV Upload** (strict RIFT schema validation)
- 🕸️ **Graph Construction** (directed money flow, adjacency list)
- 🔁 **Cycle Detection** (length 3–5)
- 🌪️ **Smurfing Detection** (fan-in / fan-out within 72 hours)
- 🧅 **Layered Shell Detection** (3+ hops through low-degree intermediates)
- 📊 **Suspicion Scoring (0–100)** with false-positive controls (merchant/payroll suppression)
- 🎯 **Fraud Ring Summary Table**
- 📄 **Exact JSON Output Download** (line-by-line match safe)
- ⚡ **Adaptive Graph Layout** (fast for 10K transactions)
- 🧭 **Node Interactions**: click/hover shows account-level detail

---

## 🧠 System Architecture (SVG Diagram)

<p align="center">
  <img alt="Architecture Diagram" src="data:image/svg+xml;utf8,
<svg xmlns='http://www.w3.org/2000/svg' width='980' height='420' viewBox='0 0 980 420'>
  <defs>
    <style>
      .box{fill:#0b1220;stroke:#2a3b6b;stroke-width:2;rx:14;ry:14}
      .title{font:700 16px Arial;fill:#ffffff}
      .txt{font:13px Arial;fill:#cbd5e1}
      .small{font:12px Arial;fill:#a7b4c7}
      .arrow{stroke:#94a3b8;stroke-width:2;marker-end:url(#m)}
    </style>
    <marker id='m' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'>
      <path d='M0,0 L8,3 L0,6 Z' fill='#94a3b8'/>
    </marker>
  </defs>

  <rect class='box' x='40' y='40' width='220' height='90'/>
  <text class='title' x='60' y='70'>CSV Upload</text>
  <text class='txt' x='60' y='95'>Strict schema validation</text>
  <text class='small' x='60' y='115'>transaction_id, sender_id...</text>

  <rect class='box' x='310' y='40' width='260' height='90'/>
  <text class='title' x='330' y='70'>Parsing &amp; Validation</text>
  <text class='txt' x='330' y='95'>Quoted CSV support</text>
  <text class='small' x='330' y='115'>timestamp + amount checks</text>

  <rect class='box' x='640' y='40' width='300' height='90'/>
  <text class='title' x='660' y='70'>Graph Construction</text>
  <text class='txt' x='660' y='95'>Adjacency list + indexing</text>
  <text class='small' x='660' y='115'>Nodes: accounts, Edges: txns</text>

  <rect class='box' x='40' y='190' width='280' height='120'/>
  <text class='title' x='60' y='220'>Pattern Detection</text>
  <text class='txt' x='60' y='245'>• Cycles (3–5)</text>
  <text class='txt' x='60' y='265'>• Smurfing (72h fan-in/out)</text>
  <text class='txt' x='60' y='285'>• Layered shells (3+ hops)</text>

  <rect class='box' x='360' y='190' width='260' height='120'/>
  <text class='title' x='380' y='220'>Scoring Engine</text>
  <text class='txt' x='380' y='245'>0–100 suspicion score</text>
  <text class='txt' x='380' y='265'>False-positive controls</text>
  <text class='small' x='380' y='285'>merchant + payroll suppression</text>

  <rect class='box' x='670' y='190' width='270' height='120'/>
  <text class='title' x='690' y='220'>Output Builder</text>
  <text class='txt' x='690' y='245'>Exact JSON format</text>
  <text class='txt' x='690' y='265'>Fraud ring summary table</text>
  <text class='small' x='690' y='285'>deterministic ordering</text>

  <rect class='box' x='210' y='340' width='280' height='70'/>
  <text class='title' x='230' y='372'>Interactive Graph UI</text>
  <text class='txt' x='230' y='395'>Cytoscape.js + ring highlighting</text>

  <rect class='box' x='540' y='340' width='300' height='70'/>
  <text class='title' x='560' y='372'>Downloadable Report</text>
  <text class='txt' x='560' y='395'>JSON export + metrics summary</text>

  <line class='arrow' x1='260' y1='85' x2='310' y2='85'/>
  <line class='arrow' x1='570' y1='85' x2='640' y2='85'/>
  <line class='arrow' x1='790' y1='130' x2='180' y2='190'/>
  <line class='arrow' x1='320' y1='250' x2='360' y2='250'/>
  <line class='arrow' x1='620' y1='250' x2='670' y2='250'/>
  <line class='arrow' x1='490' y1='310' x2='350' y2='340'/>
  <line class='arrow' x1='780' y1='310' x2='690' y2='340'/>
</svg>" />
</p>

---

## 🛠 Tech Stack

- **Next.js 14** + **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Cytoscape.js**
- In-memory graph processing (fast for hackathon scale)

---

## 📥 Input Specification (Strict RIFT Format)

Your web app accepts CSV upload with exact columns:

| Column Name | Type | Description |
|---|---|---|
| transaction_id | String | Unique transaction identifier |
| sender_id | String | Sender account ID (node) |
| receiver_id | String | Receiver account ID (node) |
| amount | Float | Transaction amount |
| timestamp | DateTime | `YYYY-MM-DD HH:MM:SS` |

---

## 🔍 Detection Patterns

### 1) Circular Fund Routing (Cycles)
- Detect cycles of length **3 to 5**
- All accounts in a cycle belong to the same ring

**Approach:** bounded DFS + canonical cycle dedupe  
**Complexity:** ~O(V + E) with depth ≤ 5

### 2) Smurfing (Fan-in / Fan-out within 72h)
- Fan-in: **10+ senders → 1 receiver** within 72h  
- Fan-out: **1 sender → 10+ receivers** within 72h  
- Adds velocity & redistribution signals

**Approach:** timestamp sorting + sliding time window  
**Complexity:** O(T log T) due to sorting

### 3) Layered Shell Networks
- Detect chains of **3+ hops**
- Intermediate accounts: **2–3 total transactions** (shell-like)
- Designed to expose multi-hop layering

**Approach:** bounded DFS with shell ratio constraints + pruning  
**Complexity:** bounded traversal with early exits

---

## 📊 Suspicion Score Methodology (0–100)

We compute a weighted risk score per account using detected patterns:

| Signal | Contribution |
|---|---:|
| Cycle participation | +35 |
| Fan-in (smurfing) | +30 |
| Fan-out (smurfing) | +30 |
| High velocity | +10 |
| Layered shell chain | +25 |

### False-Positive Controls (Important)
To avoid flagging legitimate accounts:
- **Merchants:** high volume + low variance amounts + not in cycles → reduce score
- **Payroll:** periodic payments with consistent amounts to many receivers → reduce score

Final score:
- Clamped to 0–100
- Rounded to 1 decimal
- Sorted descending in JSON output

---

## 📤 Required Outputs (RIFT-Compliant)

### ✅ 1) Interactive Graph Visualization
- All accounts shown as nodes
- Directed edges represent money flow
- Rings highlighted, suspicious nodes visually distinct
- Node click/hover shows details

### ✅ 2) Downloadable JSON Output (Exact Format)

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
