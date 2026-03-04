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
- `client/src/hooks/use-analyze.ts` — Mutation hook for Claude AI analysis
- `client/src/lib/scoring.ts` — Anomaly detection scoring algorithm with configurable weights + trade enrichment
- `client/src/lib/categories.ts` — Market category classification (Politics, Military, Economics, Cyber/Intel, Regional)
- `client/src/lib/utils.ts` — Formatting and color utilities
- `client/src/index.css` — Dark terminal theme, custom CSS (scanlines, glow effects)

### Backend
- `server/routes.ts` — GET /api/markets, GET /api/trades, POST /api/analyze endpoints
- `shared/schema.ts` — Zod schemas for analyze request/response
- `shared/routes.ts` — API contract definitions

### Scoring Algorithm
Markets scored 1-99 based on (weights configurable via UI 0x-2x):
- **Volume Spike** — Volume spike vs 30-day daily average (up to 30 pts)
- **Concentration** — 24h volume as % of all-time volume (up to 20 pts)
- **Convergence** — Multi-signal convergence (12 pts), high absolute volume + spike (10 pts)
- **Spread** — Wide bid-ask spread (5 pts)
- Trade enrichment (when expanded): order flow imbalance (12 pts), trade clustering (15 pts), large trades (up to 20 pts)

### Category System
Markets classified into 5 categories by keyword matching on question text:
- **Politics** (blue) — elections, presidents, parliament, diplomacy
- **Military** (red) — war, troops, missiles, conflict
- **Economics** (yellow) — sanctions, tariffs, oil, trade
- **Cyber/Intel** (green) — cyber, hack, espionage, intelligence
- **Regional** (orange) — specific countries/regions, territorial disputes

### Design
- Dark terminal aesthetic: #0a0a14 background
- JetBrains Mono for data, IBM Plex Sans for body
- Color coding: red (80+ critical), orange (55+ high), yellow (30+ moderate), green (low)
- Glow effects (red, orange, yellow, green, blue)
- Mobile-first feed layout

## External APIs
- Polymarket Gamma API: `https://gamma-api.polymarket.com/markets`
- Polymarket CLOB API: `https://clob.polymarket.com/trades`
- Anthropic API: Claude AI analysis (requires ANTHROPIC_API_KEY secret)
