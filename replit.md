# DarkWatch — Prediction Market Surveillance Dashboard

## Overview
Mobile-first web app that monitors Polymarket prediction markets for potential insider trading on geopolitical events. Uses anomaly detection scoring and Claude AI analysis.

## Architecture
- **Frontend**: Vite + React (TypeScript), Tailwind CSS
- **Backend**: Express (TypeScript) with Anthropic AI integration via Replit AI Integrations
- **No database** — all data comes from Polymarket APIs in real time

## Key Files

### Frontend
- `client/src/pages/Dashboard.tsx` — Main mobile feed page
- `client/src/components/FeedCard.tsx` — Expandable market card with score, flags, trades, AI analysis
- `client/src/components/Header.tsx` — Compact sticky header with DARKWATCH branding and LIVE indicator
- `client/src/components/ScoreGauge.tsx` — Animated SVG ring score visualization
- `client/src/hooks/use-markets.ts` — Fetches from Polymarket Gamma API, filters geopolitical markets, calculates risk scores
- `client/src/hooks/use-trades.ts` — Fetches recent trades from Polymarket CLOB API
- `client/src/hooks/use-analyze.ts` — Mutation hook for Claude AI analysis
- `client/src/lib/scoring.ts` — Anomaly detection scoring algorithm + trade enrichment
- `client/src/lib/utils.ts` — Formatting and color utilities
- `client/src/index.css` — Dark terminal theme, custom CSS (scanlines, glow effects)

### Backend
- `server/routes.ts` — POST /api/analyze endpoint that proxies to Anthropic API for insider trading assessment
- `shared/schema.ts` — Zod schemas for analyze request/response
- `shared/routes.ts` — API contract definitions

### Scoring Algorithm
Markets scored 1-99 based on:
- Volume spike vs 30-day daily average (up to 30 pts)
- 24h volume as % of all-time volume (up to 20 pts)
- Multi-signal convergence (12 pts)
- High absolute volume + spike (10 pts)
- Wide bid-ask spread (5 pts)
- Trade enrichment (when expanded): order flow imbalance (12 pts), trade clustering (15 pts), large trades (up to 20 pts)

### Design
- Dark terminal aesthetic: #0a0a14 background
- JetBrains Mono for data, IBM Plex Sans for body
- Color coding: red (80+ critical), orange (55+ high), yellow (30+ moderate), green (low)
- Scanline CSS overlay, glow effects
- Mobile-first feed layout

## External APIs
- Polymarket Gamma API: `https://gamma-api.polymarket.com/markets`
- Polymarket CLOB API: `https://clob.polymarket.com/trades`
- Anthropic (via Replit AI Integrations): Claude AI analysis
