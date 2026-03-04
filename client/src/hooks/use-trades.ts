import { useQuery } from "@tanstack/react-query";

export interface Trade {
  price: number;
  size: number;
  side: "BUY" | "SELL";
  timestamp: string;
}

export function useTrades(marketId: string | null) {
  return useQuery({
    queryKey: ["trades", marketId],
    enabled: !!marketId,
    queryFn: async () => {
      try {
        if (marketId?.startsWith("mock-")) {
          return generateMockTrades();
        }

        const res = await fetch(`/api/trades?market=${encodeURIComponent(marketId!)}`);
        if (!res.ok) throw new Error("Failed to fetch trades");

        const data = await res.json();
        return (data.data || data || []).map((t: any) => ({
          price: parseFloat(t.price),
          size: parseFloat(t.size),
          side: t.side,
          timestamp: t.timestamp
            ? (String(t.timestamp).length <= 13
              ? new Date(parseInt(t.timestamp)).toISOString()
              : t.timestamp)
            : new Date().toISOString(),
        })) as Trade[];
      } catch (e) {
        console.warn("Falling back to mock trades");
        return generateMockTrades();
      }
    },
    refetchInterval: 10000,
  });
}

function generateMockTrades(): Trade[] {
  const sides: ("BUY" | "SELL")[] = ["BUY", "SELL", "BUY", "BUY", "SELL"];
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < 15; i++) {
    trades.push({
      price: 0.30 + (Math.random() * 0.1),
      size: Math.floor(Math.random() * 5000) + 100,
      side: sides[Math.floor(Math.random() * sides.length)],
      timestamp: new Date(now - (i * 180000) - Math.random() * 60000).toISOString()
    });
  }
  return trades;
}
