import { runVPINPipeline } from "./vpin";

export interface DetectionFlag {
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  points: number;
}

export interface MarketRiskProfile {
  score: number;
  flags: DetectionFlag[];
  preliminary: boolean;
}

export interface VPINSignals {
  vpinCurrent: number;
  vpinMax: number;
  vpinMean: number;
  vpinTrend: number;
  volumeAnomaly: number;
  priceDriftScore: number;
  nAlertBuckets: number;
  alertPct: number;
  overallScore: number;
  nTrades: number;
  confidence: "high" | "medium" | "low";
}

export type VPINEnrichedProfile = MarketRiskProfile & { vpinSignals?: VPINSignals };

function smoothScale(value: number, low: number, high: number, maxPts: number): number {
  if (value <= low) return 0;
  if (value >= high) return maxPts;
  const t = (value - low) / (high - low);
  return maxPts * t;
}

export function calculateActivityRank(market: any): MarketRiskProfile {
  const vol24 = parseFloat(market.volume24hr || "0");
  const volTotal = parseFloat(market.volume || "0");
  const vol1wk = parseFloat(market.volume1wk || "0");

  const parsedStart = market.startDate ? new Date(market.startDate) : null;
  const startDate = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : null;
  const now = new Date();
  const marketAgeDays = startDate ? Math.max(1, (now.getTime() - startDate.getTime()) / 86400000) : 30;

  const avgDaily = volTotal > 0 ? volTotal / marketAgeDays : 0;
  const spikeRatio = avgDaily > 0 ? vol24 / avgDaily : 0;

  const weeklyDailyAvg = vol1wk > 0 ? vol1wk / 7 : 0;
  const weekDeviation = weeklyDailyAvg > 0 ? vol24 / weeklyDailyAvg : 0;

  const vol24Ratio = volTotal > 0 ? vol24 / volTotal : 0;

  let rank = 0;
  if (spikeRatio > 1.2) rank += smoothScale(Math.log2(spikeRatio), Math.log2(1.2), Math.log2(10), 30);
  if (vol24 > 10000) rank += smoothScale(Math.log10(vol24), 4, 7.5, 15);
  if (vol24Ratio > 0.05) rank += smoothScale(Math.log10(vol24Ratio * 100), Math.log10(5), Math.log10(50), 25);
  if (weekDeviation > 2) rank += smoothScale(weekDeviation, 2, 15, 20);
  if (marketAgeDays < 14 && vol24 > 50000) rank += smoothScale(vol24 / Math.max(marketAgeDays, 1), 5000, 200000, 10);

  rank = Math.min(Math.max(Math.round(rank), 1), 99);

  return {
    score: rank,
    flags: [],
    preliminary: true,
  };
}

export function computeVPINScore(
  trades: Array<{ price: number; size: number; side: string; timestamp: string }>
): VPINEnrichedProfile | null {
  if (!trades || trades.length === 0) return null;

  const vpinResult = runVPINPipeline(trades);
  if (!vpinResult) return null;

  const flags: DetectionFlag[] = [];
  const vpinScore99 = Math.round(vpinResult.overallScore * 99);

  if (vpinResult.vpinCurrent >= 0.4) {
    const severity: DetectionFlag["severity"] = vpinResult.vpinCurrent >= 0.7 ? "CRITICAL" : vpinResult.vpinCurrent >= 0.5 ? "HIGH" : "MEDIUM";
    const pts = Math.round(smoothScale(vpinResult.vpinCurrent, 0.3, 0.8, 25));
    flags.push({
      name: `VPIN Elevated (${(vpinResult.vpinCurrent * 100).toFixed(0)}% informed flow)`,
      severity,
      points: pts,
    });
  }

  if (vpinResult.vpinMax >= 0.5) {
    const pts = Math.round(smoothScale(vpinResult.vpinMax, 0.4, 0.9, 20));
    flags.push({
      name: `Peak VPIN (${(vpinResult.vpinMax * 100).toFixed(0)}% max informed flow)`,
      severity: vpinResult.vpinMax >= 0.75 ? "CRITICAL" : "HIGH",
      points: pts,
    });
  }

  if (vpinResult.vpinTrend > 0.2) {
    const pts = Math.round(smoothScale(vpinResult.vpinTrend, 0.1, 0.8, 15));
    flags.push({
      name: `VPIN Trend Rising (+${(vpinResult.vpinTrend * 100).toFixed(0)}%)`,
      severity: vpinResult.vpinTrend > 0.5 ? "HIGH" : "MEDIUM",
      points: pts,
    });
  }

  if (vpinResult.volumeAnomaly > 0.3) {
    const pts = Math.round(smoothScale(vpinResult.volumeAnomaly, 0.2, 0.8, 18));
    flags.push({
      name: `Volume Anomaly (z-score: ${(vpinResult.volumeAnomaly * 100).toFixed(0)}%)`,
      severity: vpinResult.volumeAnomaly > 0.7 ? "CRITICAL" : vpinResult.volumeAnomaly > 0.5 ? "HIGH" : "MEDIUM",
      points: pts,
    });
  }

  if (vpinResult.priceDriftScore > 0.3) {
    const pts = Math.round(smoothScale(vpinResult.priceDriftScore, 0.2, 0.8, 18));
    flags.push({
      name: `Price Drift to Boundary (${(vpinResult.priceDriftScore * 100).toFixed(0)}% signal)`,
      severity: vpinResult.priceDriftScore > 0.6 ? "HIGH" : "MEDIUM",
      points: pts,
    });
  }

  if (vpinResult.alertPct > 10) {
    const pts = Math.round(smoothScale(vpinResult.alertPct, 5, 50, 15));
    flags.push({
      name: `${vpinResult.nAlertBuckets} Alert Buckets (${vpinResult.alertPct.toFixed(0)}% of volume clock)`,
      severity: vpinResult.alertPct > 30 ? "CRITICAL" : vpinResult.alertPct > 15 ? "HIGH" : "MEDIUM",
      points: pts,
    });
  }

  const finalScore = Math.min(Math.max(vpinScore99, 1), 99);

  return {
    score: finalScore,
    flags: flags.sort((a, b) => b.points - a.points),
    preliminary: false,
    vpinSignals: {
      vpinCurrent: vpinResult.vpinCurrent,
      vpinMax: vpinResult.vpinMax,
      vpinMean: vpinResult.vpinMean,
      vpinTrend: vpinResult.vpinTrend,
      volumeAnomaly: vpinResult.volumeAnomaly,
      priceDriftScore: vpinResult.priceDriftScore,
      nAlertBuckets: vpinResult.nAlertBuckets,
      alertPct: vpinResult.alertPct,
      overallScore: vpinResult.overallScore,
      nTrades: vpinResult.nTrades,
      confidence: vpinResult.confidence,
    },
  };
}
