import { z } from "zod";

export const analyzeRequestSchema = z.object({
  marketId: z.string(),
  title: z.string(),
  description: z.string(),
  score: z.number(),
  flags: z.array(
    z.object({
      name: z.string(),
      severity: z.string(),
      points: z.number(),
    })
  ),
  recentTrades: z.array(
    z.object({
      price: z.number(),
      size: z.number(),
      side: z.string(),
      timestamp: z.string(),
    })
  ).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const analyzeResponseSchema = z.object({
  analysis: z.string(),
});

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
