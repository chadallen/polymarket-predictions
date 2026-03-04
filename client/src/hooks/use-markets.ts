import { useQuery } from "@tanstack/react-query";
import { calculateMarketRisk, type MarketRiskProfile } from "@/lib/scoring";

const GEO_KEYWORDS = [
  'war', 'military', 'sanctions', 'tariff', 'election', 'president', 
  'ceasefire', 'nuclear', 'iran', 'russia', 'ukraine', 'china', 'taiwan', 
  'north korea', 'israel', 'gaza', 'opec', 'oil', 'nato', 'troops', 
  'missile', 'coup', 'treaty', 'diplomacy', 'summit', 'pentagon', 
  'kremlin', 'drone', 'cyber', 'hack', 'espionage', 'border', 'territory', 
  'assassination', 'putin', 'zelensky', 'biden', 'trump'
];

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
}

export type DarkWatchMarket = PolymarketData & {
  riskProfile: MarketRiskProfile;
};

// Generate fallback data in case Polymarket API is blocked
function getMockMarkets(): DarkWatchMarket[] {
  const mocks = [
    { q: "Will there be a ceasefire in Ukraine by July 2024?", v: "4500000", v24: "850000" },
    { q: "Will China impose new tariffs on US tech before May?", v: "1200000", v24: "45000" },
    { q: "Will the US confirm a drone hack originating from Iran?", v: "89000", v24: "42000" },
    { q: "Will NATO deploy advisory troops to border regions in 2024?", v: "2100000", v24: "600000" },
    { q: "Will OPEC announce an emergency supply cut this week?", v: "340000", v24: "15000" },
    { q: "Who will win the upcoming Presidential Election?", v: "150000000", v24: "2000000" },
  ];

  return mocks.map((m, i) => {
    const market = {
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
    };
    return {
      ...market,
      riskProfile: calculateMarketRisk(market)
    };
  });
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets", "geo-filtered"],
    queryFn: async () => {
      try {
        const res = await fetch("https://gamma-api.polymarket.com/markets?limit=500&active=true&closed=false");
        if (!res.ok) throw new Error("Failed to fetch markets");
        const data = await res.json();
        
        const geoPattern = new RegExp(`\\b(${GEO_KEYWORDS.join('|')})\\b`, 'i');
        
        const filtered: DarkWatchMarket[] = data
          .filter((m: any) => geoPattern.test(m.question || ''))
          .map((m: any) => ({
            ...m,
            riskProfile: calculateMarketRisk(m)
          }))
          .sort((a: DarkWatchMarket, b: DarkWatchMarket) => b.riskProfile.score - a.riskProfile.score);

        if (filtered.length === 0) return getMockMarkets();
        return filtered;
      } catch (e) {
        console.warn("Falling back to mock data due to API error", e);
        return getMockMarkets().sort((a, b) => b.riskProfile.score - a.riskProfile.score);
      }
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}
