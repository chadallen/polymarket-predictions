import type { Express } from "express";
import { type Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "@shared/routes";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

Provide a brief, intelligence-style assessment (max 3 paragraphs) of the anomaly risk, treating the data as geopolitical signals.
`;

      const response = await anthropic.messages.create({
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
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
