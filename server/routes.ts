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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/markets", async (_req, res) => {
    try {
      const response = await fetch(
        "https://gamma-api.polymarket.com/markets?limit=500&active=true&closed=false"
      );
      if (!response.ok) {
        return res.status(response.status).json({ message: "Failed to fetch markets from Polymarket" });
      }
      const data = await response.json();
      res.json(data);
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

  return httpServer;
}
