export interface DetectionFlag {
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  points: number;
  category: ScoringCategory;
}

export interface MarketRiskProfile {
  score: number;
  flags: DetectionFlag[];
  volumeSpikeRatio: number;
  priceChange24h: number;
}

export type ScoringCategory = "volumeSpike" | "concentration" | "spread" | "convergence";

export interface ScoringWeights {
  volumeSpike: number;
  concentration: number;
  spread: number;
  convergence: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  volumeSpike: 1.0,
  concentration: 1.0,
  spread: 1.0,
  convergence: 1.0,
};

export const WEIGHT_LABELS: Record<ScoringCategory, { label: string; description: string }> = {
  volumeSpike: { label: "Volume Spike", description: "Unusual 24h volume vs daily average" },
  concentration: { label: "Concentration", description: "24h volume as % of all-time volume" },
  spread: { label: "Bid-Ask Spread", description: "Wide spread indicating thin liquidity" },
  convergence: { label: "Convergence", description: "Multiple signals firing together" },
};

function applyWeight(basePoints: number, weight: number): number {
  const w = Math.max(0, Math.min(2, Number.isFinite(weight) ? weight : 1));
  return basePoints * w;
}

export function calculateMarketRisk(market: any, weights: ScoringWeights = DEFAULT_WEIGHTS): MarketRiskProfile {
  let score = 1;
  const flags: DetectionFlag[] = [];

  const vol24 = parseFloat(market.volume24hr || "0");
  const volTotal = parseFloat(market.volume || "0");

  let volumeSpikeRatio = 1.0;
  if (vol24 > 0 && volTotal > vol24) {
    const avgDaily = volTotal / 30;
    volumeSpikeRatio = avgDaily > 0 ? vol24 / avgDaily : 1.0;
  }

  if (volumeSpikeRatio > 5) {
    const pts = applyWeight(30, weights.volumeSpike);
    score += pts;
    flags.push({ name: "Critical Volume Spike (>5x daily avg)", severity: "CRITICAL", points: Math.round(pts), category: "volumeSpike" });
  } else if (volumeSpikeRatio > 2.5) {
    const pts = applyWeight(15, weights.volumeSpike);
    score += pts;
    flags.push({ name: "High Volume Spike (>2.5x daily avg)", severity: "HIGH", points: Math.round(pts), category: "volumeSpike" });
  } else if (volumeSpikeRatio > 1.5) {
    const pts = applyWeight(5, weights.volumeSpike);
    score += pts;
    flags.push({ name: "Elevated Volume (>1.5x daily avg)", severity: "MEDIUM", points: Math.round(pts), category: "volumeSpike" });
  }

  let priceChange24h = 0;
  const prices = market.outcomePrices;
  if (prices && Array.isArray(prices) && prices.length >= 1) {
    const currentPrice = parseFloat(prices[0]);
    if (currentPrice > 0 && currentPrice < 1) {
      const distFromCenter = Math.abs(currentPrice - 0.5);
      priceChange24h = distFromCenter * 100;
    }
  }

  if (market.bestBid !== undefined && market.bestAsk !== undefined) {
    const spread = parseFloat(market.bestAsk) - parseFloat(market.bestBid);
    if (spread > 0.08) {
      const pts = applyWeight(5, weights.spread);
      score += pts;
      flags.push({ name: "Wide Bid-Ask Spread (>8¢)", severity: "MEDIUM", points: Math.round(pts), category: "spread" });
    }
  }

  const vol24Ratio = volTotal > 0 ? vol24 / volTotal : 0;
  if (vol24Ratio > 0.3) {
    const pts = applyWeight(20, weights.concentration);
    score += pts;
    flags.push({ name: "24h volume is >30% of all-time volume", severity: "CRITICAL", points: Math.round(pts), category: "concentration" });
  } else if (vol24Ratio > 0.15) {
    const pts = applyWeight(10, weights.concentration);
    score += pts;
    flags.push({ name: "24h volume is >15% of all-time volume", severity: "HIGH", points: Math.round(pts), category: "concentration" });
  }

  if (vol24 > 500000 && volumeSpikeRatio > 2) {
    const pts = applyWeight(10, weights.convergence);
    score += pts;
    flags.push({ name: "High absolute volume with spike pattern", severity: "HIGH", points: Math.round(pts), category: "convergence" });
  }

  if (vol24 > 100000 && vol24Ratio > 0.1 && volumeSpikeRatio > 1.5) {
    const pts = applyWeight(12, weights.convergence);
    score += pts;
    flags.push({ name: "Multi-signal convergence detected", severity: "HIGH", points: Math.round(pts), category: "convergence" });
  }

  score = Math.min(Math.max(score, 1), 99);

  return {
    score: Math.round(score),
    flags: flags.sort((a, b) => b.points - a.points),
    volumeSpikeRatio: Math.round(volumeSpikeRatio * 10) / 10,
    priceChange24h: Math.round(priceChange24h * 10) / 10,
  };
}

export function enrichScoreWithTrades(
  profile: MarketRiskProfile,
  trades: Array<{ price: number; size: number; side: string; timestamp: string }>
): MarketRiskProfile {
  if (!trades || trades.length === 0) return profile;

  let score = profile.score;
  const flags = [...profile.flags];

  const buys = trades.filter(t => t.side === 'BUY');
  const sells = trades.filter(t => t.side === 'SELL');
  if (buys.length > 0 && sells.length > 0) {
    const ratio = Math.max(buys.length / sells.length, sells.length / buys.length);
    if (ratio > 4) {
      score += 12;
      flags.push({ name: `One-Sided Order Flow (${ratio.toFixed(1)}:1)`, severity: "HIGH", points: 12, category: "convergence" });
    }
  }

  if (trades.length >= 5) {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 0; i <= sorted.length - 5; i++) {
      const span = new Date(sorted[i + 4].timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
      if (span < 3600000) {
        score += 15;
        flags.push({ name: "Trade Clustering (5+ trades in 1hr)", severity: "HIGH", points: 15, category: "convergence" });
        break;
      }
    }
  }

  const sizes = trades.map(t => t.size);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const largeTrades = sizes.filter(s => s > avgSize * 5);
  if (largeTrades.length > 0) {
    const pts = Math.min(largeTrades.length * 5, 20);
    score += pts;
    flags.push({ name: `Large Trade(s) Detected (>5x avg size)`, severity: largeTrades.length >= 3 ? "CRITICAL" : "HIGH", points: pts, category: "volumeSpike" });
  }

  score = Math.min(Math.max(score, 1), 99);

  return {
    ...profile,
    score: Math.round(score),
    flags: flags.sort((a, b) => b.points - a.points),
  };
}
