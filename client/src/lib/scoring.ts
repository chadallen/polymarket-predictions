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

export type ScoringCategory = "volumeSpike" | "concentration" | "spread" | "convergence" | "timeDecay" | "baseline";

export interface ScoringWeights {
  volumeSpike: number;
  concentration: number;
  spread: number;
  convergence: number;
  timeDecay: number;
  baseline: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  volumeSpike: 1.0,
  concentration: 1.0,
  spread: 1.0,
  convergence: 1.0,
  timeDecay: 1.0,
  baseline: 1.0,
};

export const WEIGHT_LABELS: Record<ScoringCategory, { label: string; description: string }> = {
  volumeSpike: { label: "Volume Spike", description: "Unusual 24h volume vs daily average" },
  concentration: { label: "Concentration", description: "24h volume as % of all-time volume" },
  spread: { label: "Bid-Ask Spread", description: "Wide spread indicating thin liquidity" },
  convergence: { label: "Convergence", description: "Multiple signals firing together" },
  timeDecay: { label: "Time Decay", description: "Recent trade clustering in last 1-2 hours" },
  baseline: { label: "Baseline Dev", description: "Deviation from market's historical norm" },
};

function clampWeight(weight: number): number {
  return Math.max(0, Math.min(2, Number.isFinite(weight) ? weight : 1));
}

function smoothScale(value: number, low: number, high: number, maxPts: number): number {
  if (value <= low) return 0;
  if (value >= high) return maxPts;
  const t = (value - low) / (high - low);
  return maxPts * t;
}

export function calculateMarketRisk(market: any, weights: ScoringWeights = DEFAULT_WEIGHTS): MarketRiskProfile {
  let score = 0;
  const flags: DetectionFlag[] = [];

  const vol24 = parseFloat(market.volume24hr || "0");
  const volTotal = parseFloat(market.volume || "0");
  const vol1wk = parseFloat(market.volume1wk || "0");
  const vol1mo = parseFloat(market.volume1mo || "0");

  const parsedStart = market.startDate ? new Date(market.startDate) : null;
  const startDate = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : null;
  const now = new Date();
  const marketAgeDays = startDate ? Math.max(1, (now.getTime() - startDate.getTime()) / 86400000) : 30;

  const avgDaily = volTotal > 0 ? volTotal / marketAgeDays : 0;
  let volumeSpikeRatio = avgDaily > 0 ? vol24 / avgDaily : 0;

  const w1 = clampWeight(weights.volumeSpike);
  if (volumeSpikeRatio > 1.2) {
    const logSpike = Math.log2(volumeSpikeRatio);
    const pts = smoothScale(logSpike, Math.log2(1.2), Math.log2(10), 28) * w1;
    score += pts;
    const severity: DetectionFlag["severity"] = volumeSpikeRatio > 5 ? "CRITICAL" : volumeSpikeRatio > 2.5 ? "HIGH" : "MEDIUM";
    flags.push({
      name: `Volume Spike (${volumeSpikeRatio.toFixed(1)}x daily avg over ${Math.round(marketAgeDays)}d)`,
      severity,
      points: Math.round(pts),
      category: "volumeSpike",
    });
  }

  if (vol24 > 10000) {
    const logVol = Math.log10(vol24);
    const pts = smoothScale(logVol, 4, 7.5, 10) * w1;
    score += pts;
    flags.push({
      name: `Absolute Volume ($${vol24 >= 1000000 ? (vol24 / 1000000).toFixed(1) + "M" : (vol24 / 1000).toFixed(0) + "K"}/24h)`,
      severity: vol24 > 5000000 ? "HIGH" : vol24 > 500000 ? "MEDIUM" : "LOW",
      points: Math.round(pts),
      category: "volumeSpike",
    });
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

  const weekChange = parseFloat(market.oneWeekPriceChange || "0");
  if (Math.abs(weekChange) > 0.03) {
    const magnitude = Math.abs(weekChange);
    const pts = smoothScale(magnitude, 0.03, 0.5, 12) * w1;
    score += pts;
    const direction = weekChange > 0 ? "up" : "down";
    flags.push({
      name: `Price Shift (${(magnitude * 100).toFixed(0)}% ${direction} this week)`,
      severity: magnitude > 0.2 ? "HIGH" : magnitude > 0.1 ? "MEDIUM" : "LOW",
      points: Math.round(pts),
      category: "volumeSpike",
    });
  }

  const w3 = clampWeight(weights.spread);
  if (market.bestBid !== undefined && market.bestAsk !== undefined) {
    const spread = parseFloat(market.bestAsk) - parseFloat(market.bestBid);
    if (spread > 0.03) {
      const pts = smoothScale(spread, 0.03, 0.20, 8) * w3;
      score += pts;
      const severity: DetectionFlag["severity"] = spread > 0.12 ? "HIGH" : spread > 0.06 ? "MEDIUM" : "LOW";
      flags.push({
        name: `Bid-Ask Spread (${(spread * 100).toFixed(0)}¢)`,
        severity,
        points: Math.round(pts),
        category: "spread",
      });
    }
  }

  const vol24Ratio = volTotal > 0 ? vol24 / volTotal : 0;
  const w2 = clampWeight(weights.concentration);
  if (vol24Ratio > 0.05) {
    const logRatio = Math.log10(vol24Ratio * 100);
    const pts = smoothScale(logRatio, Math.log10(5), Math.log10(50), 22) * w2;
    score += pts;
    const severity: DetectionFlag["severity"] = vol24Ratio > 0.3 ? "CRITICAL" : vol24Ratio > 0.15 ? "HIGH" : "MEDIUM";
    flags.push({
      name: `Volume Concentration (${(vol24Ratio * 100).toFixed(1)}% of all-time)`,
      severity,
      points: Math.round(pts),
      category: "concentration",
    });
  }

  const wBaseline = clampWeight(weights.baseline);

  if (vol1wk > 0 && vol24 > 0) {
    const weeklyDailyAvg = vol1wk / 7;
    const weekDeviation = weeklyDailyAvg > 0 ? vol24 / weeklyDailyAvg : 0;
    if (weekDeviation > 2) {
      const pts = smoothScale(weekDeviation, 2, 15, 18) * wBaseline;
      score += pts;
      flags.push({
        name: `Weekly Baseline Deviation (${weekDeviation.toFixed(1)}x 7d avg)`,
        severity: weekDeviation > 8 ? "CRITICAL" : weekDeviation > 4 ? "HIGH" : "MEDIUM",
        points: Math.round(pts),
        category: "baseline",
      });
    }
  }

  if (vol1mo > 0 && vol1wk > 0) {
    const monthlyWeekAvg = vol1mo / 4;
    const weekAccel = monthlyWeekAvg > 0 ? vol1wk / monthlyWeekAvg : 0;
    if (weekAccel > 2.5) {
      const pts = smoothScale(weekAccel, 2.5, 10, 12) * wBaseline;
      score += pts;
      flags.push({
        name: `Volume Acceleration (week ${weekAccel.toFixed(1)}x vs monthly avg)`,
        severity: weekAccel > 6 ? "HIGH" : weekAccel > 3.5 ? "MEDIUM" : "LOW",
        points: Math.round(pts),
        category: "baseline",
      });
    }
  }

  if (marketAgeDays < 14 && vol24 > 50000) {
    const youngMarketIntensity = vol24 / Math.max(marketAgeDays, 1);
    const pts = smoothScale(youngMarketIntensity, 5000, 200000, 10) * wBaseline;
    if (pts > 0) {
      score += pts;
      flags.push({
        name: `Young Market Surge (${Math.round(marketAgeDays)}d old, $${(vol24 / 1000).toFixed(0)}K/24h)`,
        severity: marketAgeDays < 3 ? "HIGH" : "MEDIUM",
        points: Math.round(pts),
        category: "baseline",
      });
    }
  }

  const w4 = clampWeight(weights.convergence);
  const activeFlags = flags.length;
  if (activeFlags >= 2) {
    const convergenceBonus = smoothScale(activeFlags, 1, 6, 12) * w4;
    score += convergenceBonus;
    flags.push({
      name: `${activeFlags} signals converging`,
      severity: activeFlags >= 5 ? "HIGH" : "MEDIUM",
      points: Math.round(convergenceBonus),
      category: "convergence",
    });
  }

  score = Math.min(Math.max(Math.round(score), 1), 99);

  return {
    score,
    flags: flags.sort((a, b) => b.points - a.points),
    volumeSpikeRatio: Math.round(volumeSpikeRatio * 10) / 10,
    priceChange24h: Math.round(priceChange24h * 10) / 10,
  };
}

export function enrichScoreWithTrades(
  profile: MarketRiskProfile,
  trades: Array<{ price: number; size: number; side: string; timestamp: string }>,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): MarketRiskProfile {
  if (!trades || trades.length === 0) return profile;

  let score = profile.score;
  const flags = [...profile.flags];

  const buys = trades.filter(t => t.side === 'BUY');
  const sells = trades.filter(t => t.side === 'SELL');
  const totalTrades = buys.length + sells.length;
  if (totalTrades > 0) {
    let ratio: number;
    if (buys.length === 0 || sells.length === 0) {
      ratio = totalTrades;
    } else {
      ratio = Math.max(buys.length / sells.length, sells.length / buys.length);
    }
    if (ratio > 3) {
      const pts = smoothScale(ratio, 3, 10, 15);
      score += pts;
      const dominant = buys.length > sells.length ? "BUY" : "SELL";
      flags.push({ name: `One-Sided Flow (${ratio.toFixed(1)}:1 ${dominant})`, severity: ratio > 6 ? "CRITICAL" : "HIGH", points: Math.round(pts), category: "convergence" });
    }
  }

  if (trades.length >= 5) {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 0; i <= sorted.length - 5; i++) {
      const span = new Date(sorted[i + 4].timestamp).getTime() - new Date(sorted[i].timestamp).getTime();
      if (span < 3600000) {
        const intensity = Math.max(1, 3600000 / Math.max(span, 1000));
        const pts = smoothScale(intensity, 1, 60, 18);
        score += pts;
        flags.push({ name: "Trade Clustering (5+ trades in 1hr)", severity: "HIGH", points: Math.round(pts), category: "convergence" });
        break;
      }
    }
  }

  const sizes = trades.map(t => t.size);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const largeTrades = sizes.filter(s => s > avgSize * 5);
  if (largeTrades.length > 0) {
    const maxRatio = Math.max(...largeTrades) / avgSize;
    const pts = smoothScale(maxRatio, 5, 50, 20);
    score += pts;
    flags.push({ name: `Large Trade(s) Detected (${largeTrades.length} @ >${Math.round(maxRatio)}x avg)`, severity: largeTrades.length >= 3 ? "CRITICAL" : "HIGH", points: Math.round(pts), category: "volumeSpike" });
  }

  const wTimeDecay = clampWeight(weights.timeDecay);
  const now = Date.now();
  const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sorted.length >= 3) {
    const tradeTimestamps = sorted.map(t => new Date(t.timestamp).getTime());
    const tradeSizes = sorted.map(t => t.size);
    const oldestTrade = tradeTimestamps[0];
    const newestTrade = tradeTimestamps[tradeTimestamps.length - 1];
    const totalSpan = newestTrade - oldestTrade;

    if (totalSpan > 0) {
      const recentCutoff = newestTrade - totalSpan * 0.25;
      let recentVolume = 0;
      let totalVolume = 0;
      for (let i = 0; i < tradeSizes.length; i++) {
        totalVolume += tradeSizes[i];
        if (tradeTimestamps[i] >= recentCutoff) {
          recentVolume += tradeSizes[i];
        }
      }

      const recentPct = totalVolume > 0 ? recentVolume / totalVolume : 0;
      if (recentPct > 0.6) {
        const pts = smoothScale(recentPct, 0.6, 0.95, 16) * wTimeDecay;
        score += pts;
        flags.push({
          name: `Recency Spike (${(recentPct * 100).toFixed(0)}% volume in last quarter of window)`,
          severity: recentPct > 0.85 ? "CRITICAL" : recentPct > 0.75 ? "HIGH" : "MEDIUM",
          points: Math.round(pts),
          category: "timeDecay",
        });
      }
    }

    const last2hr = tradeTimestamps.filter(t => now - t < 7200000).length;
    const last12hr = tradeTimestamps.filter(t => now - t < 43200000).length;
    if (last12hr > 0) {
      const recencyRatio = last2hr / last12hr;
      if (recencyRatio > 0.5 && last2hr >= 3) {
        const pts = smoothScale(recencyRatio, 0.5, 0.95, 14) * wTimeDecay;
        score += pts;
        flags.push({
          name: `Activity Surge (${last2hr}/${last12hr} trades in last 2hr)`,
          severity: recencyRatio > 0.8 ? "HIGH" : "MEDIUM",
          points: Math.round(pts),
          category: "timeDecay",
        });
      }
    }
  }

  score = Math.min(Math.max(score, 1), 99);

  return {
    ...profile,
    score: Math.round(score),
    flags: flags.sort((a, b) => b.points - a.points),
  };
}
