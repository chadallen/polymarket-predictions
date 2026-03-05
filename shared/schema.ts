import { z } from "zod";

export const analyzeMarketSchema = z.object({
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

export const analyzeRequestSchema = z.object({
  markets: z.array(analyzeMarketSchema).min(1).max(5),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const analyzeResponseSchema = z.object({
  analysis: z.string(),
});

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

export const recommendRequestSchema = z.object({
  activeCategory: z.string().nullable().optional(),
  markets: z.array(z.object({
    question: z.string(),
    score: z.number(),
    volume24hr: z.union([z.string(), z.number()]).transform(String),
    volume: z.union([z.string(), z.number()]).transform(String),
    flags: z.array(z.object({
      name: z.string(),
      severity: z.string(),
      points: z.number(),
    })),
    outcomePrices: z.array(z.union([z.string(), z.number()]).transform(String)).optional(),
    outcomes: z.array(z.string()).optional(),
    categories: z.array(z.string()),
  })),
});

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

export const recommendResponseSchema = z.object({
  recommendation: z.string(),
});

export type RecommendResponse = z.infer<typeof recommendResponseSchema>;
