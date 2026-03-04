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
Markets scored 1-99 using continuous log-scaled scoring (weights configurable via UI 0x-2x):
- **Volume Spike** — Log2-scaled spike ratio vs 30-day avg (up to 28 pts), absolute volume log10-scaled (up to 10 pts), weekly price momentum (up to 12 pts)
- **Concentration** — Log10-scaled 24h/all-time volume ratio (up to 22 pts)
- **Convergence** — Multi-signal convergence bonus scaled by flag count (up to 10 pts)
- **Spread** — Bid-ask spread linearly scaled (up to 8 pts)
- Trade enrichment (when expanded): one-sided order flow including fully-one-sided detection (up to 15 pts), trade clustering (up to 18 pts), large trades (up to 20 pts)
- `smoothScale(value, low, high, maxPts)` provides truly continuous 0→maxPts interpolation (no step-function jumps)
- Spike ratio computed with `Math.max(volTotal, vol24)` to handle stale volume snapshots

### Category System
Markets classified into 6 categories using Polymarket's native event tags (mapped server-side in `routes.ts`):
- **Politics** (blue) — politics, elections, geopolitics, world events
- **Sports** (green) — NBA, NFL, MLB, soccer, tennis, golf, UFC, Olympics
- **Crypto** (orange) — crypto, bitcoin, ethereum, defi, crypto prices
- **Tech** (red) — AI, tech, science, space
- **Culture** (yellow) — culture, entertainment, music, movies, games, pop culture
- **Economy** (gray-blue) — economy, stocks, finance, fed, inflation, business
Server uses events API (`/events`) which provides tags; `TAG_TO_CATEGORY` map in `routes.ts` maps Polymarket tags to our 6 categories.

### Design
- Dark terminal aesthetic: #0a0a14 background
- JetBrains Mono for data, IBM Plex Sans for body
- Color coding: red (63+ critical), orange (58+ high), yellow (30+ moderate), green (low)
- Critical/High counts in header are clickable to filter by severity
- Glow effects (red, orange, yellow, green, blue)
- Mobile-first feed layout

## External APIs
- Polymarket Gamma API: `https://gamma-api.polymarket.com/markets`
- Polymarket CLOB API: `https://clob.polymarket.com/trades`
- Anthropic API: Claude AI analysis (requires ANTHROPIC_API_KEY secret)
