# Polymarket Predictions

A real-time surveillance dashboard that monitors Polymarket prediction markets for unusual and potentially informed trading activity — then uses AI to translate those signals into actionable real-world trade recommendations.

> **Insider signals → real-world trades**

## What It Does

Prediction markets often surface insider knowledge before it becomes public. When someone with non-public information bets heavily on a geopolitical outcome, election, or policy event, their trading leaves a detectable fingerprint in the order flow.

This app:
1. **Monitors** Polymarket markets in real time, refreshing every 30 seconds
2. **Scores** each market using VPIN (Volume-Synchronized Probability of Informed Trading) — a quantitative model from academic market microstructure research
3. **Flags** markets where informed trading is statistically elevated
4. **Generates** AI-powered real-world trade recommendations (e.g. "short oil futures given elevated informed flow on Middle East conflict markets")

## VPIN Model

VPIN is the exclusive detection model. No heuristic scoring.

**How it works:**
- Trades are classified as buyer- or seller-initiated using Bulk Volume Classification (BVC) and the normal CDF of price changes
- Trades are grouped into fixed-volume buckets (the "volume clock")
- VPIN = rolling average of order imbalance / total volume across a bucket window
- Elevated VPIN indicates a high proportion of informed order flow
- Additional signals: volume anomaly (z-score), price drift toward resolution boundary, VPIN trend

**Score thresholds:** Critical ≥70 · High 62–69 · Moderate 30–61 · Low <30

**Detection flags:** VPIN Elevated · Peak VPIN · VPIN Trend Rising · Volume Anomaly · Price Drift to Boundary · Alert Buckets

## Features

- Live market feed sorted by activity rank, filterable by category (Politics, Crypto, Tech, Economy, Culture) and severity
- Expandable market cards showing VPIN stats, score factor breakdown, recent trades, and outcome prices
- "Find the Trade" — per-market AI analysis generating a specific real-world trade recommendation based on VPIN signals
- "Get Trade Signals" — cross-market AI briefing identifying the highest-conviction opportunities across the full feed
- Score transparency: preliminary score factors (volume spike, concentration, weekly deviation) and VPIN signal breakdown with point contributions
- Mobile-first dark terminal UI with glow effects and live timestamp

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Express (TypeScript), Anthropic Claude API |
| Detection | Custom VPIN pipeline (BVC, volume clock, rolling VPIN) |
| Data | Polymarket Gamma API + CLOB API (no database) |
| AI | Claude claude-haiku-4-5 for market analysis and trade recommendations |

## Setup

**Prerequisites:** Node.js 18+, an Anthropic API key

```bash
npm install
```

Set your Anthropic API key as an environment variable:
```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

The app runs on port 5000.

## Rate Limiting

AI endpoints are rate-limited to **10 requests per IP per 24 hours** (shared across both the per-market analysis and the cross-market briefing) to control API costs. The limit resets automatically after 24 hours.

## Data Sources

- **Market data:** [Polymarket Gamma API](https://gamma-api.polymarket.com/markets)
- **Trade data:** [Polymarket CLOB API](https://clob.polymarket.com/trades)
- **AI analysis:** [Anthropic Claude](https://anthropic.com) (requires API key)

## How to Read the Dashboard

| Element | Meaning |
|---|---|
| Score badge (e.g. `73`) | VPIN-derived informed trading score (1–99) |
| `est` label | Preliminary score based on volume activity — VPIN not yet computed |
| CRITICAL / HIGH | Score thresholds indicating elevated informed flow |
| Detection flags | Specific VPIN signals that triggered with point contributions |
| Score Factors | Volume metrics driving the preliminary score before trade data loads |
| +Xpts | Points contributed by each signal toward the final score |
