import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { calculateMarketRisk, type MarketRiskProfile, type ScoringWeights, DEFAULT_WEIGHTS } from "@/lib/scoring";

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
  eventSlug?: string;
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
    { q: "Will the Indiana Pacers win the 2026 NBA Finals?", v: "4500000", v24: "850000", cats: ["sports"] },
    { q: "Will Bitcoin reach $150k before July 2025?", v: "1200000", v24: "45000", cats: ["crypto"] },
    { q: "Will OpenAI release GPT-5 before June?", v: "89000", v24: "42000", cats: ["tech"] },
    { q: "Who will win the 2028 Presidential Election?", v: "150000000", v24: "2000000", cats: ["politics"] },
    { q: "Will the Fed cut rates in March?", v: "340000", v24: "15000", cats: ["economy"] },
    { q: "Will Taylor Swift announce a new album?", v: "2100000", v24: "600000", cats: ["culture"] },
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
    categories: m.cats,
    isMock: true,
  }));
}

function useRawMarkets() {
  return useQuery({
    queryKey: ["markets", "events"],
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
              categories: m.polymarketCategories || ["other"],
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
