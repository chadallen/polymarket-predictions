export interface VPINConfig {
  volumeBucketSize: number;
  nBucketsWindow: number;
  sigmaWindow: number;
  alertThreshold: number;
}

export const DEFAULT_VPIN_CONFIG: VPINConfig = {
  volumeBucketSize: 50,
  nBucketsWindow: 30,
  sigmaWindow: 20,
  alertThreshold: 0.4,
};

export interface VPINBucket {
  bucketId: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  nTrades: number;
  orderImbalance: number;
  normImbalance: number;
  vpin: number;
}

export interface VPINResult {
  buckets: VPINBucket[];
  alerts: VPINBucket[];
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

const COMPOSITE_WEIGHTS = {
  vpinCurrent: 0.25,
  vpinMax: 0.15,
  vpinTrendPositive: 0.15,
  volumeAnomaly: 0.15,
  priceDrift: 0.15,
  alertPct: 0.10,
  entityConcentration: 0.05,
};

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

function estimateSigma(prices: number[], window: number): number[] {
  const returns: number[] = [0];
  for (let i = 1; i < prices.length; i++) {
    returns.push(prices[i] - prices[i - 1]);
  }

  const sigma: number[] = new Array(prices.length);

  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const windowReturns = returns.slice(start, end);
    if (windowReturns.length < 2) {
      sigma[i] = 1e-4;
      continue;
    }
    const mean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
    const variance = windowReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (windowReturns.length - 1);
    sigma[i] = Math.max(Math.sqrt(variance), 1e-8);
  }

  const validSigmas = sigma.filter(s => s > 1e-7);
  const fallback = validSigmas.length > 0 ? validSigmas.reduce((a, b) => a + b, 0) / validSigmas.length : 1e-4;
  for (let i = 0; i < sigma.length; i++) {
    if (!Number.isFinite(sigma[i]) || sigma[i] <= 1e-8) {
      sigma[i] = fallback;
    }
  }

  return sigma;
}

function bulkVolumeClassification(
  prices: number[],
  volumes: number[],
  sigmaArray: number[]
): { buyVolume: number[]; sellVolume: number[] } {
  const buyVolume: number[] = [];
  const sellVolume: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const deltaP = i === 0 ? 0 : prices[i] - prices[i - 1];
    const sigma = Math.max(sigmaArray[i] || 1e-8, 1e-8);
    const z = deltaP / sigma;
    const buyPct = normalCDF(z);
    buyVolume.push(volumes[i] * buyPct);
    sellVolume.push(volumes[i] * (1 - buyPct));
  }

  return { buyVolume, sellVolume };
}

function createVolumeBuckets(
  buyVolume: number[],
  sellVolume: number[],
  bucketSize: number
): VPINBucket[] {
  const buckets: VPINBucket[] = [];
  let currentBucket = { id: 0, buy: 0, sell: 0, total: 0, count: 0 };
  const remaining = bucketSize;
  let bucketRemaining = remaining;

  for (let i = 0; i < buyVolume.length; i++) {
    let tradeBuy = buyVolume[i];
    let tradeSell = sellVolume[i];
    let tradeTotal = tradeBuy + tradeSell;

    while (tradeTotal > 0) {
      if (tradeTotal <= bucketRemaining) {
        currentBucket.buy += tradeBuy;
        currentBucket.sell += tradeSell;
        currentBucket.total += tradeTotal;
        currentBucket.count++;
        bucketRemaining -= tradeTotal;
        tradeTotal = 0;
      } else {
        const fraction = bucketRemaining / tradeTotal;
        const allocBuy = tradeBuy * fraction;
        const allocSell = tradeSell * fraction;
        currentBucket.buy += allocBuy;
        currentBucket.sell += allocSell;
        currentBucket.total += bucketRemaining;
        currentBucket.count++;

        tradeBuy -= allocBuy;
        tradeSell -= allocSell;
        tradeTotal = tradeBuy + tradeSell;

        const imbalance = Math.abs(currentBucket.buy - currentBucket.sell);
        buckets.push({
          bucketId: currentBucket.id,
          buyVolume: currentBucket.buy,
          sellVolume: currentBucket.sell,
          totalVolume: currentBucket.total,
          nTrades: currentBucket.count,
          orderImbalance: imbalance,
          normImbalance: currentBucket.total > 0 ? imbalance / currentBucket.total : 0,
          vpin: 0,
        });

        currentBucket = { id: currentBucket.id + 1, buy: 0, sell: 0, total: 0, count: 0 };
        bucketRemaining = bucketSize;
      }
    }
  }

  if (currentBucket.total > 0) {
    const imbalance = Math.abs(currentBucket.buy - currentBucket.sell);
    buckets.push({
      bucketId: currentBucket.id,
      buyVolume: currentBucket.buy,
      sellVolume: currentBucket.sell,
      totalVolume: currentBucket.total,
      nTrades: currentBucket.count,
      orderImbalance: imbalance,
      normImbalance: currentBucket.total > 0 ? imbalance / currentBucket.total : 0,
      vpin: 0,
    });
  }

  return buckets;
}

function computeRollingVPIN(buckets: VPINBucket[], nWindow: number): void {
  for (let i = 0; i < buckets.length; i++) {
    const start = Math.max(0, i - nWindow + 1);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= i; j++) {
      sum += buckets[j].normImbalance;
      count++;
    }
    buckets[i].vpin = count > 0 ? sum / count : 0;
  }
}

function computeVolumeAnomaly(volumes: number[], lookbackPct = 0.7): number {
  const split = Math.floor(volumes.length * lookbackPct);
  if (split < 10 || volumes.length - split < 5) return 0;

  const baseline = volumes.slice(0, split);
  const recent = volumes.slice(split);

  const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const baselineStd = Math.sqrt(
    baseline.reduce((sum, v) => sum + (v - baselineMean) ** 2, 0) / baseline.length
  );

  if (baselineStd < 1e-8) return 0;

  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const zScore = (recentMean - baselineMean) / baselineStd;

  return 1.0 / (1.0 + Math.exp(-0.5 * (zScore - 2)));
}

function computePriceDrift(prices: number[], lookbackPct = 0.7): number {
  const split = Math.floor(prices.length * lookbackPct);
  if (split < 20) return 0;

  const histPrices = prices.slice(0, split);
  const returns: number[] = [];
  for (let i = 1; i < histPrices.length; i++) {
    returns.push(histPrices[i] - histPrices[i - 1]);
  }
  const histVol = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, r) => sum + r ** 2, 0) / returns.length)
    : 1e-4;

  const recent = prices.slice(split);
  if (recent.length < 5) return 0;

  const startPrice = recent[0];
  const endPrice = recent[recent.length - 1];
  const nearestBoundary = endPrice > 0.5 ? 1.0 : 0.0;
  const distanceStart = Math.abs(startPrice - nearestBoundary);
  const distanceEnd = Math.abs(endPrice - nearestBoundary);

  const drift = distanceStart - distanceEnd;
  const expectedDrift = histVol * Math.sqrt(recent.length);
  if (expectedDrift < 1e-8) return 0;

  const driftRatio = drift / expectedDrift;
  return 1.0 / (1.0 + Math.exp(-1.0 * (driftRatio - 1.5)));
}

function computeVPINTrend(vpinSeries: number[], window = 20): number {
  let w = Math.min(window, vpinSeries.length);
  if (w < 3) return 0;

  const recent = vpinSeries.slice(-w);
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.max(-1, Math.min(1, slope * 100));
}

function computeCompositeScore(
  vpinCurrent: number,
  vpinMax: number,
  vpinTrend: number,
  volumeAnomaly: number,
  priceDrift: number,
  alertPct: number,
): number {
  const w = COMPOSITE_WEIGHTS;
  const score =
    w.vpinCurrent * vpinCurrent +
    w.vpinMax * vpinMax +
    w.vpinTrendPositive * Math.max(0, vpinTrend) +
    w.volumeAnomaly * volumeAnomaly +
    w.priceDrift * priceDrift +
    w.alertPct * Math.min(alertPct / 100, 1.0) +
    w.entityConcentration * 0;

  return Math.max(0, Math.min(1, score));
}

export function runVPINPipeline(
  trades: Array<{ price: number; size: number; side: string; timestamp: string }>,
  configOverride?: Partial<VPINConfig>
): VPINResult | null {
  if (!trades || trades.length < 20) {
    return null;
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const prices = sorted.map(t => t.price);
  const volumes = sorted.map(t => t.size);
  const nTrades = prices.length;

  const totalVol = volumes.reduce((a, b) => a + b, 0);
  const autoBucketSize = Math.max(10, Math.floor(totalVol / 300));

  const config: VPINConfig = {
    ...DEFAULT_VPIN_CONFIG,
    volumeBucketSize: autoBucketSize,
    ...configOverride,
  };

  const sigmaArray = estimateSigma(prices, config.sigmaWindow);

  const { buyVolume, sellVolume } = bulkVolumeClassification(prices, volumes, sigmaArray);

  const buckets = createVolumeBuckets(buyVolume, sellVolume, config.volumeBucketSize);

  if (buckets.length === 0) return null;

  computeRollingVPIN(buckets, config.nBucketsWindow);

  const alerts = buckets.filter(b => b.vpin >= config.alertThreshold);

  const vpinCurrent = buckets[buckets.length - 1].vpin;
  const vpinMax = Math.max(...buckets.map(b => b.vpin));
  const vpinMean = buckets.reduce((s, b) => s + b.vpin, 0) / buckets.length;
  const vpinTrend = computeVPINTrend(buckets.map(b => b.vpin));
  const volumeAnomaly = computeVolumeAnomaly(volumes);
  const priceDriftScore = computePriceDrift(prices);
  const nAlertBuckets = alerts.length;
  const alertPct = (nAlertBuckets / buckets.length) * 100;

  const overallScore = computeCompositeScore(
    vpinCurrent,
    vpinMax,
    vpinTrend,
    volumeAnomaly,
    priceDriftScore,
    alertPct,
  );

  let confidence: "high" | "medium" | "low" = "low";
  if (nTrades >= 500) confidence = "high";
  else if (nTrades >= 100) confidence = "medium";

  return {
    buckets,
    alerts,
    vpinCurrent,
    vpinMax,
    vpinMean,
    vpinTrend,
    volumeAnomaly,
    priceDriftScore,
    nAlertBuckets,
    alertPct,
    overallScore,
    nTrades,
    confidence,
  };
}
