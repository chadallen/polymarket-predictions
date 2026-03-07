# DarkWatch — Prediction Market Surveillance Dashboard

## Overview
Mobile-first web app that monitors Polymarket prediction markets for potential insider trading on geopolitical events. Uses VPIN (Volume-Synchronized Probability of Informed Trading) as the exclusive detection model with Claude AI analysis.

## Architecture
- **Frontend**: Vite + React (TypeScript), Tailwind CSS
- **Backend**: Express (TypeScript) with Anthropic API (user-provided API key via ANTHROPIC_API_KEY secret)
- **No database** — all data comes from Polymarket APIs in real time

## Key Files

### Frontend
- `client/src/pages/Dashboard.tsx` — Main mobile feed page with category filters, severity filters, AI recommendation
- `client/src/components/FeedCard.tsx` — Expandable market card with VPIN score, detection flags, trades, AI analysis
- `client/src/components/Header.tsx` — Compact sticky header with DARKWATCH branding and LIVE indicator
- `client/src/components/ScoreGauge.tsx` — Animated SVG ring score visualization
- `client/src/hooks/use-markets.ts` — Fetches from Polymarket Gamma API, filters markets, calculates preliminary activity ranks
- `client/src/hooks/use-trades.ts` — Fetches recent trades from Polymarket CLOB API
- `client/src/hooks/use-analyze.ts` — Mutation hook for Claude AI analysis (single market)
- `client/src/hooks/use-recommend.ts` — Mutation hook for AI recommendation (top markets briefing)
- `client/src/lib/scoring.ts` — VPIN-only scoring: `calculateActivityRank()` (preliminary feed sorting), `computeVPINScore()` (authoritative VPIN score)
- `client/src/lib/vpin.ts` — Research-grade VPIN pipeline (BVC, volume bucketing, rolling VPIN, anomaly detection)
- `client/src/lib/categories.ts` — Market category classification (Politics, Crypto, Tech, Culture, Economy)
- `client/src/lib/utils.ts` — Formatting and color utilities
- `client/src/index.css` — Dark terminal theme, custom CSS (scanlines, glow effects)

### Backend
- `server/routes.ts` — GET /api/markets, GET /api/trades, POST /api/analyze, POST /api/recommend endpoints
- `shared/schema.ts` — Zod schemas for analyze/recommend request/response
- `shared/routes.ts` — API contract definitions

### Scoring: VPIN Model (Exclusive)
VPIN is the ONLY scoring system. No old heuristic scoring remains.

**Preliminary Activity Rank** (`calculateActivityRank()` in `scoring.ts`)
- Simple volume-based ranker for initial feed sorting before trades load
- Uses spike ratio, absolute volume, concentration, weekly deviation, young market surge
- Shows "est" label on card to indicate preliminary score
- NOT a detection score — just sorts the feed by activity level

**VPIN Detection** (`computeVPINScore()` in `scoring.ts`, algorithms in `vpin.ts`)
When trade data loads (card expanded), VPIN becomes THE score:
- **BVC** — Classifies each trade as buy/sell using normalized price change Z = ΔP/σ and normal CDF
- **Volume Bucketing** — Groups trades into fixed-volume buckets (volume clock)
- **Rolling VPIN** — Rolling average of order imbalance / total volume across bucket window
- **Volume Anomaly** — Z-score based comparison, sigmoid mapped to [0,1]
- **Price Drift** — Detects price drifting toward resolution boundary
- **VPIN Trend** — Linear trend of VPIN series
- **Composite Score** — Weighted: VPIN current 25%, VPIN max 15%, trend 15%, vol anomaly 15%, price drift 15%, alert % 10%
- Score = pure `overallScore * 99` (no blending with old scores)
- Detection flags: VPIN Elevated, Peak VPIN, VPIN Trend Rising, Volume Anomaly, Price Drift, Alert Buckets
- Confidence: high (500+ trades), medium (100+), low (<100)
- Auto-tuned bucket size: total_volume / 300 (min 10)

**Thresholds**: Critical ≥70, High 62–69, Moderate 30–61, Low <30

### Category System
Markets classified into 5 categories using Polymarket's native event tags:
- **Politics** (blue), **Crypto** (orange), **Tech** (red), **Culture** (yellow), **Economy** (gray-blue)
- Sports excluded (filtered server-side via EXCLUDED_TAGS)
- Default category filter: politics

### Design
- Dark terminal aesthetic: #0a0a14 background
- JetBrains Mono for data, IBM Plex Sans for body
- Color coding: red (70+ critical), orange (62+ high), yellow (30+ moderate), green (low)
- Critical/High counts are clickable severity filters
- Glow effects (red, orange, yellow, green, blue)
- Mobile-first feed layout
- Footer: "VPIN model · refreshing every 30s"

## External APIs
- Polymarket Gamma API: `https://gamma-api.polymarket.com/markets`
- Polymarket CLOB API: `https://clob.polymarket.com/trades`
- Anthropic API: Claude AI analysis (claude-haiku-4-5, requires ANTHROPIC_API_KEY)
  - Per-market analysis (max_tokens 512)
  - AI Recommendation briefing (max_tokens 1024)
