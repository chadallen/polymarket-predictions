# DarkWatch — Prediction Market Surveillance Dashboard

## Overview
Mobile-first web app that monitors Polymarket prediction markets for potential insider trading on geopolitical events. Uses anomaly detection scoring and Claude AI analysis.

## Architecture
- **Frontend**: Vite + React (TypeScript), Tailwind CSS
- **Backend**: Express (TypeScript) with Anthropic API (user-provided API key via ANTHROPIC_API_KEY secret)
- **No database** — all data comes from Polymarket APIs in real time

## Key Files

### Frontend
- `client/src/pages/Dashboard.tsx` — Main mobile feed page with category filters, search, and scoring controls
- `client/src/components/FeedCard.tsx` — Expandable market card with score, flags, trades, category badges, AI analysis
- `client/src/components/Header.tsx` — Compact sticky header with DARKWATCH branding and LIVE indicator
- `client/src/components/ScoreGauge.tsx` — Animated SVG ring score visualization
- `client/src/components/ScoringPanel.tsx` — Custom scoring weights UI with sliders (0x-2x per flag category)
- `client/src/hooks/use-markets.ts` — Fetches from Polymarket Gamma API, filters geopolitical markets, calculates risk scores, classifies categories
- `client/src/hooks/use-trades.ts` — Fetches recent trades from Polymarket CLOB API
- `client/src/hooks/use-analyze.ts` — Mutation hook for Claude AI analysis (single market)
- `client/src/hooks/use-recommend.ts` — Mutation hook for AI recommendation (top 25 markets briefing)
- `client/src/lib/scoring.ts` — Anomaly detection scoring algorithm with configurable weights + trade enrichment
- `client/src/lib/categories.ts` — Market category classification (Politics, Military, Economics, Cyber/Intel, Regional)
- `client/src/lib/utils.ts` — Formatting and color utilities
- `client/src/index.css` — Dark terminal theme, custom CSS (scanlines, glow effects)

### Backend
- `server/routes.ts` — GET /api/markets, GET /api/trades, POST /api/analyze, POST /api/recommend endpoints
- `shared/schema.ts` — Zod schemas for analyze/recommend request/response
- `shared/routes.ts` — API contract definitions

### Scoring Algorithm
Markets scored 1-99 using two-layer scoring:

**Layer 1: Market Metadata Scoring** (`calculateMarketRisk()` in `scoring.ts`)
- **Volume Spike** — Log2-scaled spike ratio vs daily avg, absolute volume, weekly price momentum
- **Concentration** — Log10-scaled 24h/all-time volume ratio
- **Baseline Deviation** — Weekly deviation, volume acceleration, young market surge
- **Convergence** — Multi-signal convergence bonus
- **Spread** — Bid-ask spread linearly scaled

**Layer 2: VPIN Detection** (`enrichScoreWithTrades()` in `scoring.ts`, algorithms in `vpin.ts`)
When trade data is loaded (card expanded), runs research-grade VPIN analysis:
- **Bulk Volume Classification (BVC)** — Classifies each trade as buy/sell using normalized price change Z = ΔP/σ and normal CDF (Easley, López de Prado & O'Hara 2012)
- **Volume Bucketing** — Groups trades into fixed-volume buckets (volume clock instead of time clock)
- **Rolling VPIN** — Rolling average of order imbalance / total volume across bucket window
- **Volume Anomaly** — Z-score based comparison of recent vs baseline volume, sigmoid mapped to [0,1]
- **Price Drift** — Detects price drifting toward resolution boundary (0 or 1) faster than historical volatility would predict
- **VPIN Trend** — Linear trend of VPIN series; positive = increasing informed trading
- **Composite Score** — Weighted combination: VPIN current (25%), VPIN max (15%), VPIN trend (15%), volume anomaly (15%), price drift (15%), alert bucket % (10%)
- Final score = 35% metadata base + 65% VPIN composite, mapped to 0-99 scale
- VPIN signals generate detection flags: VPIN Elevated, Peak VPIN, VPIN Trend Rising, Volume Anomaly, Price Drift to Boundary, Alert Buckets
- Confidence levels: high (500+ trades), medium (100+), low (<100)
- Auto-tuned bucket size: total_volume / 300 (min 10)

**Key Files**: `client/src/lib/vpin.ts` (VPIN pipeline port from Python), `client/src/lib/scoring.ts` (scoring + VPIN integration)

### Category System
Markets classified into 5 categories using Polymarket's native event tags (mapped server-side in `routes.ts`):
- **Politics** (blue) — politics, elections, geopolitics, world events
- **Crypto** (orange) — crypto, bitcoin, ethereum, defi, crypto prices
- **Tech** (red) — AI, tech, science, space
- **Culture** (yellow) — culture, entertainment, music, movies, games, pop culture
- **Economy** (gray-blue) — economy, stocks, finance, fed, inflation, business
Sports markets are excluded entirely (filtered out server-side via EXCLUDED_TAGS).
Server uses events API (`/events`) which provides tags; `TAG_TO_CATEGORY` map in `routes.ts` maps Polymarket tags to our 5 categories.

### Design
- Dark terminal aesthetic: #0a0a14 background
- JetBrains Mono for data, IBM Plex Sans for body
- Color coding: red (70+ critical), orange (62+ high), yellow (30+ moderate), green (low)
- Critical/High counts in header are clickable to filter by severity
- Glow effects (red, orange, yellow, green, blue)
- Mobile-first feed layout

## External APIs
- Polymarket Gamma API: `https://gamma-api.polymarket.com/markets`
- Polymarket CLOB API: `https://clob.polymarket.com/trades`
- Anthropic API: Claude AI analysis (requires ANTHROPIC_API_KEY secret)
  - Per-market analysis (max_tokens 2048): Anomaly assessment + exact trade recommendations with ticker, direction, entry price, target, stop loss, timeframe, thesis
  - AI Recommendation briefing (max_tokens 2048): Top 3 picks with insider signal + exact trade per pick (instrument, entry, target, stop, timeframe, risk/reward) + macro view trade
  - Both prompts explicitly exclude Polymarket positions — real-world trades only (stocks, ETFs, futures, forex, options, bonds)
