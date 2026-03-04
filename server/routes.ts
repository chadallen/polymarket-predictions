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

  "sports": "sports",
  "nba": "sports",
  "nfl": "sports",
  "mlb": "sports",
  "nhl": "sports",
  "soccer": "sports",
  "basketball": "sports",
  "football": "sports",
  "baseball": "sports",
  "tennis": "sports",
  "golf": "sports",
  "boxing": "sports",
  "mma": "sports",
  "ufc": "sports",
  "f1": "sports",
  "cricket": "sports",
  "rugby": "sports",
  "nba finals": "sports",
  "nba champion": "sports",
  "premier league": "sports",
  "champions league": "sports",
  "la liga": "sports",
  "serie a": "sports",
  "world cup": "sports",
  "super bowl": "sports",
  "march madness": "sports",
  "olympics": "sports",

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

      for (const page of pages) {
        if (!page.ok) continue;
        const events = await page.json();
        for (const event of events) {
          const categories = mapTagsToCategories(event.tags || []);
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

      const prompt = `
Please analyze this prediction market for potential insider trading or unusual activity.

Market ID: ${input.marketId}
Title: ${input.title}
Description: ${input.description}
Insider Score: ${input.score}/99

Detection Flags:
${input.flags.map(f => `- ${f.name} (${f.severity}, ${f.points} pts)`).join('\n')}

Recent Trades:
${input.recentTrades?.map(t => `- ${t.side} ${t.size} shares @ $${t.price} (at ${t.timestamp})`).join('\n') || 'None'}

Provide a brief, intelligence-style assessment (max 3 paragraphs) of the anomaly risk and what the trading signals might indicate.
`;

      const response = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
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

      const prompt = `You are an expert prediction market analyst. Below are the top ${input.markets.length} markets ranked by anomaly/risk score from a surveillance dashboard monitoring Polymarket.

${marketSummaries}

Based on these markets and their anomaly signals, provide a concise intelligence briefing (4-6 paragraphs):
1. Identify the 3-5 most interesting markets and explain WHY they stand out (what combination of signals makes them notable)
2. Flag any markets where the trading patterns might suggest informed/insider activity
3. Note any cross-market themes or patterns you see
4. Give your assessment of which markets are worth watching most closely right now

Be direct, analytical, and specific. Reference actual market names and data points. Write in a professional intelligence analysis style.`;

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
