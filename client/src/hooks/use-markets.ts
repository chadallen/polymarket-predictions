import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { calculateMarketRisk, type MarketRiskProfile, type ScoringWeights, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { classifyMarket } from "@/lib/categories";

export interface PolymarketData {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  volume: string;
  volume24hr: string;
  outcomes: string[];
  outcomePrices: string[];
  active: boolean;
  closed: boolean;
  bestBid?: string;
  bestAsk?: string;
  events?: Array<{ slug: string; ticker?: string }>;
}

export type DarkWatchMarket = PolymarketData & {
  riskProfile: MarketRiskProfile;
  categories: string[];
  isMock?: boolean;
};

interface RawMarket extends PolymarketData {
  categories: string[];
  isMock?: boolean;
}

function getMockRawMarkets(): RawMarket[] {
  const mocks = [
    { q: "Will there be a ceasefire in Ukraine by July 2025?", v: "4500000", v24: "850000" },
    { q: "Will China impose new tariffs on US tech before May?", v: "1200000", v24: "45000" },
    { q: "Will the US confirm a drone hack originating from Iran?", v: "89000", v24: "42000" },
    { q: "Will NATO deploy advisory troops to border regions in 2025?", v: "2100000", v24: "600000" },
    { q: "Will OPEC announce an emergency supply cut this week?", v: "340000", v24: "15000" },
    { q: "Who will win the upcoming Presidential Election?", v: "150000000", v24: "2000000" },
  ];

  return mocks.map((m, i) => ({
    id: `mock-${i}`,
    question: m.q,
    conditionId: `cond-${i}`,
    slug: m.q.toLowerCase().replace(/\s+/g, '-'),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    volume: m.v,
    volume24hr: m.v24,
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.34", "0.66"],
    active: true,
    closed: false,
    categories: classifyMarket(m.q),
    isMock: true,
  }));
}

function useRawMarkets() {
  return useQuery({
    queryKey: ["markets", "all"],
    queryFn: async (): Promise<RawMarket[]> => {
      try {
        const res = await fetch("/api/markets");
        if (!res.ok) throw new Error("Failed to fetch markets");
        const data = await res.json();

        const markets: RawMarket[] = data
          .map((m: any) => {
            let outcomes = m.outcomes;
            let outcomePrices = m.outcomePrices;
            try { outcomes = typeof outcomes === 'string' ? JSON.parse(outcomes) : outcomes; } catch { outcomes = []; }
            try { outcomePrices = typeof outcomePrices === 'string' ? JSON.parse(outcomePrices) : outcomePrices; } catch { outcomePrices = []; }
            if (!Array.isArray(outcomes)) outcomes = [];
            if (!Array.isArray(outcomePrices)) outcomePrices = [];
            return {
              ...m,
              outcomes,
              outcomePrices,
              categories: classifyMarket(m.question || ""),
              isMock: false,
            };
          });

        if (markets.length === 0) return getMockRawMarkets();
        return markets;
      } catch (e) {
        console.warn("Falling back to simulated data due to API error", e);
        return getMockRawMarkets();
      }
    },
    refetchInterval: 30000,
  });
}

export function useMarkets(weights: ScoringWeights = DEFAULT_WEIGHTS) {
  const query = useRawMarkets();

  const scoredMarkets = useMemo(() => {
    if (!query.data) return undefined;

    return query.data
      .map((raw): DarkWatchMarket => ({
        ...raw,
        riskProfile: calculateMarketRisk(raw, weights),
      }))
      .sort((a, b) => b.riskProfile.score - a.riskProfile.score);
  }, [query.data, weights]);

  return {
    ...query,
    data: scoredMarkets,
  };
}
