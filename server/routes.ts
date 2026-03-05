import type { Express } from "express";
import { type Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "@shared/routes";
import { z } from "zod";

function getAnthropicClient() {
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    return new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
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

      const EXCLUDED_QUESTION_PATTERNS = [
        /tweet/i,
        /\bpost(s|ing|ed)?\b.*\b(on|to|from)\b.*(x|twitter|truth social|instagram|facebook|social media)/i,
        /\b(x|twitter|truth social)\b.*\bpost/i,
        /say the word/i,
        /will .+ say ['"]?\w+['"]?/i,
        /how many .*(posts|times|videos)/i,
        /number of (posts|likes|followers|retweets|views)/i,
        /\b(elon|musk)\b/i,
        /andrew tate/i,
        /social media/i,
      ];

      function isExcludedQuestion(question: string): boolean {
        return EXCLUDED_QUESTION_PATTERNS.some(p => p.test(question));
      }

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
            if (market.endDate && new Date(market.endDate) < new Date()) continue;
            if (isExcludedQuestion(market.question || "")) continue;
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

      const marketsList = input.markets.map((m, i) =>
        `${i + 1}. "${m.title}" — Score: ${m.score}/99\n   ${m.description}\n   Flags: ${m.flags.map(f => `${f.name} (${f.severity})`).join(', ')}\n   Trades: ${m.recentTrades?.slice(0, 5).map(t => `${t.side} ${t.size}@$${t.price}`).join(', ') || 'None'}`
      ).join('\n\n');

      const prompt = `Prediction market surveillance. Here are the top ${input.markets.length} suspicious markets. Pick the ONE with the strongest insider signal and give ONE best trade.

${marketsList}

Reply in this exact format, be brief:

**Pick**: Name the market you chose and why (1 sentence).

**Signal**: 1-2 sentences on what looks suspicious.

**Trade**: ONE real-world trade (no Polymarket positions):
- **Instrument**: Ticker - Name
- **Direction**: BUY or SELL
- **Entry**: price (approx.)
- **Target**: price
- **Stop**: price
- **Timeframe**: duration
- **Why**: 1 sentence linking the insider signal to the trade`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
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

      const prompt = `Top ${input.markets.length} anomaly-scored prediction markets from Polymarket.${categoryContext}

${marketSummaries}

Pick the TOP 3 most suspicious. For each, be brief:

**Pick N: [Market Name]** (Score X)
- 1 sentence on why it looks like insider trading
- **Trade**: Ticker - Name, BUY/SELL, Entry, Target, Stop, Timeframe
- **Why**: 1 sentence

End with **Macro View**: 1 cross-market pattern${input.activeCategory ? ` in ${input.activeCategory}` : ""}, one hedge trade (Ticker, direction, entry, target, stop, timeframe).

No Polymarket positions. Traditional markets only (stocks, ETFs, futures, forex, options).`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
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
