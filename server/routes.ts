import type { Express } from "express";
import { type Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "@shared/routes";
import { z } from "zod";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please add your Anthropic API key in the Secrets tab.");
  }
  return new Anthropic({ apiKey });
}

const TAG_TO_CATEGORY: Record<string, string> = {
  "politics": "politics",
  "elections": "politics",
  "geopolitics": "politics",
  "us election": "politics",
  "global elections": "politics",
  "world elections": "politics",
  "trump": "politics",
  "world": "politics",
  "primaries": "politics",

  "crypto": "crypto",
  "crypto prices": "crypto",
  "bitcoin": "crypto",
  "ethereum": "crypto",
  "solana": "crypto",
  "defi": "crypto",
  "nft": "crypto",
  "altcoins": "crypto",

  "ai": "tech",
  "tech": "tech",
  "science": "tech",
  "space": "tech",

  "culture": "culture",
  "entertainment": "culture",
  "music": "culture",
  "movies": "culture",
  "tv": "culture",
  "awards": "culture",
  "celebrity": "culture",
  "social media": "culture",
  "games": "culture",
  "pop culture": "culture",

  "economy": "economy",
  "stocks": "economy",
  "finance": "economy",
  "fed": "economy",
  "inflation": "economy",
  "markets": "economy",
  "business": "economy",
  "trade": "economy",
};

function mapTagsToCategories(tags: Array<{label: string; slug: string}>): string[] {
  const categories = new Set<string>();
  for (const tag of tags) {
    const cat = TAG_TO_CATEGORY[tag.label.toLowerCase()];
    if (cat) categories.add(cat);
  }
  return categories.size > 0 ? Array.from(categories) : ["other"];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  let marketsCache: { data: any[]; timestamp: number } | null = null;
  const CACHE_TTL = 15000;

  app.get("/api/markets", async (_req, res) => {
    try {
      if (marketsCache && Date.now() - marketsCache.timestamp < CACHE_TTL) {
        return res.json(marketsCache.data);
      }

      const baseUrl = "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume24hr&ascending=false&limit=100";
      const pages = await Promise.all([
        fetch(`${baseUrl}&offset=0`),
        fetch(`${baseUrl}&offset=100`),
      ]);

      const allMarkets: any[] = [];
      const seenIds = new Set<string>();

      const EXCLUDED_TAGS = new Set(["sports", "nba", "nfl", "mlb", "nhl", "soccer", "basketball", "football", "baseball", "tennis", "golf", "boxing", "mma", "ufc", "f1", "cricket", "rugby", "nba finals", "nba champion", "premier league", "champions league", "la liga", "serie a", "world cup", "super bowl", "march madness", "olympics"]);

      for (const page of pages) {
        if (!page.ok) continue;
        const events = await page.json();
        for (const event of events) {
          const tags = event.tags || [];
          const isSports = tags.some((t: {label: string; slug: string}) => EXCLUDED_TAGS.has(t.label.toLowerCase()));
          if (isSports) continue;
          const categories = mapTagsToCategories(tags);
          const eventSlug = event.slug || "";
          for (const market of (event.markets || [])) {
            if (seenIds.has(market.id)) continue;
            if (!market.active || market.closed) continue;
            seenIds.add(market.id);
            allMarkets.push({
              ...market,
              polymarketCategories: categories,
              eventSlug,
            });
          }
        }
      }

      if (allMarkets.length === 0) {
        return res.status(502).json({ message: "Failed to fetch markets from Polymarket" });
      }

      marketsCache = { data: allMarkets, timestamp: Date.now() };
      res.json(allMarkets);
    } catch (err) {
      console.error("Markets proxy error:", err);
      res.status(502).json({ message: "Failed to reach Polymarket API" });
    }
  });

  app.get("/api/trades", async (req, res) => {
    try {
      const marketId = req.query.market as string;
      if (!marketId) {
        return res.status(400).json({ message: "market query param required" });
      }
      const response = await fetch(
        `https://clob.polymarket.com/trades?market=${encodeURIComponent(marketId)}`
      );
      if (!response.ok) {
        return res.status(response.status).json({ message: "Failed to fetch trades from Polymarket" });
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("Trades proxy error:", err);
      res.status(502).json({ message: "Failed to reach Polymarket CLOB API" });
    }
  });

  app.post(api.analyze.create.path, async (req, res) => {
    try {
      const input = api.analyze.create.input.parse(req.body);

      const prompt = `You are a prediction market surveillance analyst and macro trading strategist. Analyze this market for insider trading signals, then give exact real-world trade recommendations.

Market ID: ${input.marketId}
Title: ${input.title}
Description: ${input.description}
Insider Score: ${input.score}/99

Detection Flags:
${input.flags.map(f => `- ${f.name} (${f.severity}, ${f.points} pts)`).join('\n')}

Recent Trades:
${input.recentTrades?.map(t => `- ${t.side} ${t.size} shares @ $${t.price} (at ${t.timestamp})`).join('\n') || 'None'}

Provide:
1. **Anomaly Assessment** (2-3 sentences): What the trading signals indicate and the likelihood of informed trading.

2. **Trade Recommendations**: Give 2-3 specific real-world trades. For EACH trade, provide ALL of the following in a structured format:
   - **Instrument**: Exact ticker symbol and full name (e.g., "GLD - SPDR Gold Trust ETF", "CL1! - WTI Crude Oil Futures", "LMT - Lockheed Martin", "EUR/USD")
   - **Direction**: BUY (long) or SELL (short)
   - **Entry Price**: The specific price to enter at (use current approximate market price based on your knowledge — state "approx." if estimating)
   - **Target Price**: Specific profit target price
   - **Stop Loss**: Specific stop-loss price to limit downside
   - **Timeframe**: How long to hold — give a specific duration (e.g., "2-4 weeks", "hold through June 2026 expiry") and when to exit if the thesis hasn't played out
   - **Thesis**: 1-2 sentences connecting this prediction market's insider signal to why this specific asset should move

For options trades, specify: ticker, call/put, approximate strike price, expiration month, and whether to buy or sell the contract.

Do NOT recommend Polymarket positions. Traditional financial markets only — stocks, ETFs, futures (oil, gold, silver, nat gas, agricultural), forex pairs, options, bonds/treasuries.`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      const analysisText = content.type === "text" ? content.text : "No analysis generated.";

      res.status(200).json({ analysis: analysisText });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Analysis error:", err);
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.includes("ANTHROPIC_API_KEY is not configured")) {
        return res.status(503).json({ message: errMsg });
      }
      if (errMsg.includes("401") || errMsg.includes("authentication") || errMsg.includes("invalid x-api-key")) {
        return res.status(401).json({ message: "Invalid Anthropic API key. Please check your key in the Secrets tab." });
      }
      return res.status(500).json({ message: "AI analysis failed. Please try again." });
    }
  });

  app.post(api.recommend.create.path, async (req, res) => {
    try {
      const input = api.recommend.create.input.parse(req.body);

      const marketSummaries = input.markets.map((m, i) => {
        const prices = m.outcomePrices || [];
        const outcomes = m.outcomes || [];
        const priceStr = outcomes.map((o, j) => `${o}: ${prices[j] ? (parseFloat(prices[j]) * 100).toFixed(0) + '¢' : '?'}`).join(', ');
        return `${i + 1}. [Score ${m.score}] ${m.question}
   Categories: ${m.categories.join(', ')}
   24h Volume: $${parseFloat(m.volume24hr).toLocaleString()} | Total: $${parseFloat(m.volume).toLocaleString()}
   Prices: ${priceStr}
   Flags: ${m.flags.map(f => `${f.name} (${f.severity})`).join('; ')}`;
      }).join('\n\n');

      const categoryContext = input.activeCategory
        ? `\nThese markets are filtered to the "${input.activeCategory}" category. Focus your analysis specifically on insider trading patterns within ${input.activeCategory} markets.`
        : "";

      const prompt = `You are a prediction market surveillance analyst and macro trading strategist. Below are the top ${input.markets.length} markets ranked by anomaly score from Polymarket.${categoryContext}

${marketSummaries}

Give your TOP 3 PICKS. For each pick, provide:

**1. Market & Signal**
- Name the prediction market and its anomaly score
- 2-3 sentences on why it looks like insider trading: what specific combination of volume spike, concentration, price movement, and timing is suspicious

**2. Exact Trade Recommendation**
For each pick, give ONE primary trade with ALL of these details:
- **Instrument**: Exact ticker and full name (e.g., "GLD - SPDR Gold Trust ETF", "CL1! - WTI Crude Oil Futures", "RTX - RTX Corporation", "EUR/USD")
- **Direction**: BUY (long) or SELL (short)
- **Entry Price**: Specific price to buy/sell at (use approximate current market price — state "approx." if estimating)
- **Target Price**: Where to take profit
- **Stop Loss**: Where to cut losses
- **Timeframe**: Specific hold duration (e.g., "2-4 weeks", "exit by June 30 2026") and when to bail if the thesis fails
- **Risk/Reward**: Expected % gain vs % loss

For options: specify ticker, call/put, strike price, expiration month, buy/sell.

Do NOT recommend Polymarket positions. Traditional markets only — stocks, ETFs, futures (oil, gold, silver, nat gas), forex, options, bonds.

End with a **Macro View** section: one cross-market pattern${input.activeCategory ? ` within ${input.activeCategory}` : ""} and a portfolio-level hedge or macro trade with the same structured format (instrument, direction, entry, target, stop, timeframe).`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      const text = content.type === "text" ? content.text : "No recommendation generated.";

      res.status(200).json({ recommendation: text });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Recommend error:", err);
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.includes("ANTHROPIC_API_KEY is not configured")) {
        return res.status(503).json({ message: errMsg });
      }
      if (errMsg.includes("401") || errMsg.includes("authentication") || errMsg.includes("invalid x-api-key")) {
        return res.status(401).json({ message: "Invalid Anthropic API key. Please check your key in the Secrets tab." });
      }
      return res.status(500).json({ message: "AI recommendation failed. Please try again." });
    }
  });

  return httpServer;
}
