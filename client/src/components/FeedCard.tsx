import { useState, useMemo } from "react";
import { marked } from "marked";
import { type DarkWatchMarket } from "@/hooks/use-markets";
import { useTrades } from "@/hooks/use-trades";
import { useAnalyze } from "@/hooks/use-analyze";
import { computeVPINScore, type VPINSignals } from "@/lib/scoring";
import { ScoreGauge } from "./ScoreGauge";
import { formatCurrency, formatCents, cn, getScoreColor, getScoreBg } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { ChevronDown, ChevronUp, ExternalLink, Activity, Terminal } from "lucide-react";

interface FeedCardProps {
  market: DarkWatchMarket;
  rank: number;
}

export function FeedCard({ market, rank }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: trades, isLoading: tradesLoading } = useTrades(expanded ? market.id : null);
  const analyzeMutation = useAnalyze();
  const isMock = market.id.startsWith("mock-");

  const vpinResult = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    return computeVPINScore(trades);
  }, [trades]);

  const vpinSignals: VPINSignals | undefined = vpinResult?.vpinSignals;
  const vpinFlags = vpinResult?.flags || [];

  const score = vpinResult ? vpinResult.score : market.riskProfile.score;
  const isPreliminary = !vpinResult;
  const severityLabel = score >= 70 ? "CRITICAL" : score >= 62 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    analyzeMutation.mutate({
      marketId: market.id,
      title: market.question,
      description: `Market ends: ${market.endDate}. Current volume: ${market.volume}`,
      score,
      flags: vpinFlags.map(f => ({ name: f.name, severity: f.severity, points: f.points })),
      recentTrades: trades?.slice(0, 10).map(t => ({
        price: t.price,
        size: t.size,
        side: t.side,
        timestamp: t.timestamp,
      })),
    });
  };

  const vol24 = parseFloat(market.volume24hr || "0");
  const topPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : null;
  const topOutcome = market.outcomes?.[0] || "Yes";

  return (
    <div
      data-testid={`feed-card-${market.id}`}
      className={cn(
        "border rounded-md lg:rounded-lg transition-all duration-150 group/card",
        score >= 70 ? "border-[hsl(var(--dw-red))]/30 lg:border-[hsl(var(--dw-red))] bg-[hsl(var(--dw-red))]/[0.03] lg:bg-[hsl(var(--dw-red))]/20 hover:bg-[hsl(var(--dw-red))]/[0.06] lg:hover:bg-[hsl(var(--dw-red))]/25" :
        score >= 62 ? "border-[hsl(var(--dw-orange))]/20 lg:border-[hsl(var(--dw-orange))] bg-[hsl(var(--dw-orange))]/[0.02] lg:bg-[hsl(var(--dw-orange))]/15 hover:bg-[hsl(var(--dw-orange))]/[0.05] lg:hover:bg-[hsl(var(--dw-orange))]/20" :
        "border-border bg-card/40 lg:bg-card hover:bg-card/60 lg:hover:bg-card/80"
      )}
    >
      <div
        data-testid={`feed-card-toggle-${market.id}`}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
        className="w-full text-left p-4 lg:p-6 flex gap-3 lg:gap-5 cursor-pointer select-none active:opacity-80 lg:active:opacity-100"
      >
        <div className={cn(
          "w-12 h-12 lg:w-16 lg:h-16 shrink-0 rounded flex flex-col items-center justify-center border",
          getScoreBg(score)
        )}>
          <span className={cn("font-mono-data font-bold text-lg lg:text-2xl leading-none", getScoreColor(score))}>
            {score}
          </span>
          {isPreliminary && (
            <span className="text-[6px] lg:text-[8px] font-label text-muted-foreground uppercase leading-none mt-0.5">est</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 lg:gap-3">
            <p className="text-sm lg:text-lg font-medium lg:font-semibold leading-snug line-clamp-2">
              {isMock && <span className="text-[9px] lg:text-xs font-label text-muted-foreground bg-muted px-1 py-0.5 rounded mr-1.5 uppercase">Simulated</span>}
              {market.question}
            </p>
            <div className="shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
              {expanded ? (
                <div className="w-6 h-6 lg:w-7 lg:h-7 rounded bg-foreground/5 lg:bg-foreground/10 group-hover/card:bg-foreground/15 flex items-center justify-center transition-colors">
                  <ChevronUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-foreground/70 group-hover/card:text-foreground transition-colors" />
                </div>
              ) : (
                <div className="w-6 h-6 lg:w-7 lg:h-7 rounded bg-foreground/5 lg:bg-foreground/10 group-hover/card:bg-foreground/15 flex items-center justify-center transition-colors animate-[pulse_3s_ease-in-out_2]">
                  <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-foreground/70 group-hover/card:text-foreground transition-colors" />
                </div>
              )}
              {!expanded && (
                <span className="text-[7px] lg:text-[9px] font-label text-muted-foreground/60 group-hover/card:text-muted-foreground uppercase leading-none transition-colors">Details</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4 mt-1 lg:mt-3 flex-wrap">
            <span className={cn(
              "text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded font-label font-semibold uppercase",
              score >= 70 ? "bg-[hsl(var(--dw-red))]/15 lg:bg-[hsl(var(--dw-red))]/30 text-[hsl(var(--dw-red))]" :
              score >= 62 ? "bg-[hsl(var(--dw-orange))]/15 lg:bg-[hsl(var(--dw-orange))]/30 text-[hsl(var(--dw-orange))]" :
              score >= 30 ? "bg-[hsl(var(--dw-yellow))]/15 lg:bg-[hsl(var(--dw-yellow))]/30 text-[hsl(var(--dw-yellow))]" :
              "bg-[hsl(var(--dw-green))]/15 lg:bg-[hsl(var(--dw-green))]/30 text-[hsl(var(--dw-green))]"
            )}>
              {severityLabel}
            </span>
            <span className="hidden lg:inline text-sm font-mono-data font-semibold text-muted-foreground">{formatCurrency(vol24)}/24h</span>
            {topPrice !== null && (
              <span className="hidden lg:inline text-sm font-mono-data font-semibold text-muted-foreground">
                {topOutcome} {formatCents(topPrice)}
              </span>
            )}
            {vpinSignals && (
              <span className="hidden lg:inline text-sm font-mono-data text-[hsl(var(--dw-orange))]">
                VPIN {(vpinSignals.vpinCurrent * 100).toFixed(0)}%
              </span>
            )}
            {market.categories.filter(c => c !== "other").map(catId => {
              const cat = CATEGORIES.find(c => c.id === catId);
              if (!cat) return null;
              return (
                <span
                  key={catId}
                  data-testid={`badge-category-${catId}-${market.id}`}
                  className="text-[9px] lg:text-[11px] px-1 lg:px-1.5 py-0.5 rounded font-label uppercase border"
                  style={{
                    borderColor: `hsl(${cat.color} / 0.5)`,
                    color: `hsl(${cat.color})`,
                  }}
                >
                  {cat.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 lg:px-6 pb-4 lg:pb-6 space-y-4 lg:space-y-5 border-t border-border/50 lg:border-border pt-4 lg:pt-5">

          {vpinSignals ? (
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3 lg:gap-5">
                <ScoreGauge score={score} size={80} lgSize={100} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">VPIN Analysis</span>
                    <span className={cn(
                      "text-[9px] lg:text-[11px] px-1.5 py-0.5 rounded font-label uppercase",
                      vpinSignals.confidence === "high" ? "bg-[hsl(var(--dw-green))]/15 text-[hsl(var(--dw-green))]" :
                      vpinSignals.confidence === "medium" ? "bg-[hsl(var(--dw-yellow))]/15 text-[hsl(var(--dw-yellow))]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {vpinSignals.confidence} confidence ({vpinSignals.nTrades} trades)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 lg:gap-2">
                    <VPINStat label="VPIN Now" value={`${(vpinSignals.vpinCurrent * 100).toFixed(0)}%`} alert={vpinSignals.vpinCurrent >= 0.4} />
                    <VPINStat label="VPIN Peak" value={`${(vpinSignals.vpinMax * 100).toFixed(0)}%`} alert={vpinSignals.vpinMax >= 0.5} />
                    <VPINStat label="VPIN Avg" value={`${(vpinSignals.vpinMean * 100).toFixed(0)}%`} />
                    <VPINStat label="Trend" value={vpinSignals.vpinTrend > 0 ? `+${(vpinSignals.vpinTrend * 100).toFixed(0)}%` : `${(vpinSignals.vpinTrend * 100).toFixed(0)}%`} alert={vpinSignals.vpinTrend > 0.2} />
                    <VPINStat label="Vol Anomaly" value={`${(vpinSignals.volumeAnomaly * 100).toFixed(0)}%`} alert={vpinSignals.volumeAnomaly > 0.3} />
                    <VPINStat label="Price Drift" value={`${(vpinSignals.priceDriftScore * 100).toFixed(0)}%`} alert={vpinSignals.priceDriftScore > 0.3} />
                  </div>
                  {vpinSignals.nAlertBuckets > 0 && (
                    <div className="text-[10px] lg:text-xs font-mono-data text-[hsl(var(--dw-orange))]">
                      {vpinSignals.nAlertBuckets} alert bucket{vpinSignals.nAlertBuckets !== 1 ? "s" : ""} ({vpinSignals.alertPct.toFixed(0)}% of volume clock exceed threshold)
                    </div>
                  )}
                </div>
              </div>

              {vpinFlags.length > 0 && (
                <div className="space-y-1.5 lg:space-y-2">
                  <span className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">VPIN Detection Flags</span>
                  {vpinFlags.map((flag, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 lg:py-2.5 px-2.5 lg:px-4 rounded bg-background/60 lg:bg-background border border-border/50 lg:border-border text-xs lg:text-base font-mono-data">
                      <span className="truncate mr-2">{flag.name}</span>
                      <span className={cn(
                        "shrink-0 px-1.5 lg:px-2 py-0.5 rounded uppercase text-[9px] lg:text-[11px] tracking-wider",
                        flag.severity === "CRITICAL" ? "bg-[hsl(var(--dw-red))]/15 lg:bg-[hsl(var(--dw-red))]/30 text-[hsl(var(--dw-red))]" :
                        flag.severity === "HIGH" ? "bg-[hsl(var(--dw-orange))]/15 lg:bg-[hsl(var(--dw-orange))]/30 text-[hsl(var(--dw-orange))]" :
                        "bg-[hsl(var(--dw-yellow))]/15 lg:bg-[hsl(var(--dw-yellow))]/30 text-[hsl(var(--dw-yellow))]"
                      )}>
                        {flag.severity} +{flag.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 lg:gap-5">
              <ScoreGauge score={score} size={80} lgSize={100} />
              <div className="flex-1">
                {tradesLoading ? (
                  <div className="flex items-center gap-2 text-xs lg:text-sm font-mono-data text-muted-foreground animate-pulse">
                    <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    Running VPIN analysis...
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs lg:text-sm font-mono-data text-muted-foreground">
                      Preliminary activity score — expand with trade data for full VPIN analysis
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <VPINStat label="24h Volume" value={formatCurrency(vol24)} />
                      {topPrice !== null && <VPINStat label={topOutcome} value={formatCents(topPrice)} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {topPrice !== null && (
            <div className="flex items-center gap-2 lg:gap-3 text-sm lg:text-base font-mono-data flex-wrap">
              <span className="text-muted-foreground text-xs lg:text-base">Outcomes:</span>
              {market.outcomes?.map((o, i) => {
                const p = market.outcomePrices?.[i] ? parseFloat(market.outcomePrices[i]) : 0;
                return (
                  <span key={i} className="px-2 lg:px-3 py-0.5 lg:py-1 bg-secondary/50 lg:bg-secondary rounded text-xs lg:text-base">
                    {o} {formatCents(p)}
                  </span>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5 lg:space-y-2">
            <span className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">Recent Trades</span>
            {tradesLoading ? (
              <div className="py-4 text-center text-xs lg:text-base font-mono-data text-muted-foreground animate-pulse">Loading trades...</div>
            ) : trades && trades.length > 0 ? (
              <div className="space-y-1 lg:space-y-1.5">
                {trades.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1 lg:py-2 px-2 lg:px-4 rounded bg-background/40 lg:bg-background text-[11px] lg:text-sm font-mono-data">
                    <span className={cn(
                      "w-8 lg:w-12",
                      t.side === "BUY" ? "text-[hsl(var(--dw-green))]" : "text-[hsl(var(--dw-red))]"
                    )}>
                      {t.side}
                    </span>
                    <span className="text-muted-foreground">{t.size.toLocaleString()} shares</span>
                    <span>@ {formatCents(t.price)}</span>
                    <span className="text-muted-foreground">{t.timestamp.substring(11, 19)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs lg:text-base font-mono-data text-muted-foreground">No recent trades</div>
            )}
          </div>

          <div className="flex gap-2 lg:gap-3">
            <a
              href={`https://polymarket.com/event/${market.eventSlug || market.events?.[0]?.slug || market.slug}`}
              target="_blank"
              rel="noreferrer"
              data-testid={`link-polymarket-${market.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 lg:py-3 rounded text-xs lg:text-base font-label uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 lg:hover:border-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 lg:w-5 lg:h-5" />
              Polymarket
            </a>
            {!isMock && (
              <button
                data-testid={`button-analyze-${market.id}`}
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className={cn(
                  "flex-1 py-2.5 lg:py-3 rounded text-xs lg:text-base font-label uppercase border transition-colors",
                  analyzeMutation.isPending
                    ? "border-[hsl(var(--dw-blue))]/20 lg:border-[hsl(var(--dw-blue))] text-[hsl(var(--dw-blue))]/50 lg:text-[hsl(var(--dw-blue))] cursor-wait"
                    : "border-[hsl(var(--dw-blue))]/30 lg:border-[hsl(var(--dw-blue))] text-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/5 lg:bg-[hsl(var(--dw-blue))]/25 hover:bg-[hsl(var(--dw-blue))]/10 lg:hover:bg-[hsl(var(--dw-blue))]/35"
                )}
              >
                {analyzeMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 lg:w-4 lg:h-4 border border-t-transparent border-[hsl(var(--dw-blue))] rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Terminal className="w-3 h-3 lg:w-5 lg:h-5" />
                    AI Analysis
                  </span>
                )}
              </button>
            )}
          </div>

          {analyzeMutation.data && (
            <div className="p-3 lg:p-5 rounded border border-[hsl(var(--dw-blue))]/20 lg:border-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/[0.03] lg:bg-[hsl(var(--dw-blue))]/20">
              <div className="text-[10px] lg:text-sm font-label text-[hsl(var(--dw-blue))] uppercase mb-2 lg:mb-3 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 lg:w-4 lg:h-4" /> Claude Assessment
              </div>
              <div
                className="text-xs lg:text-base leading-relaxed text-foreground/85 lg:text-foreground font-mono-data prose prose-invert prose-xs lg:prose-base max-w-none [&_p]:my-1 lg:[&_p]:my-2 [&_ul]:my-1 lg:[&_ul]:my-2 [&_ol]:my-1 lg:[&_ol]:my-2 [&_li]:my-0.5 lg:[&_li]:my-1 [&_strong]:text-foreground [&_hr]:border-border/30 lg:[&_hr]:border-border [&_hr]:my-2 lg:[&_hr]:my-3"
                dangerouslySetInnerHTML={{ __html: marked.parse(analyzeMutation.data.analysis, { async: false }) as string }}
              />
            </div>
          )}

          {analyzeMutation.isError && (
            <div data-testid="text-analysis-error" className="p-3 lg:p-5 rounded border border-[hsl(var(--dw-red))]/20 lg:border-[hsl(var(--dw-red))] bg-[hsl(var(--dw-red))]/5 lg:bg-[hsl(var(--dw-red))]/25 text-[hsl(var(--dw-red))] font-mono-data text-xs lg:text-base">
              {analyzeMutation.error?.message || "Analysis failed. Check connection."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VPINStat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn(
      "p-1.5 lg:p-2.5 rounded border text-center",
      alert
        ? "border-[hsl(var(--dw-orange))]/30 bg-[hsl(var(--dw-orange))]/5"
        : "border-border/50 bg-background/50"
    )}>
      <div className="text-[8px] lg:text-[10px] font-label text-muted-foreground uppercase mb-0.5">{label}</div>
      <div className={cn(
        "font-mono-data text-[11px] lg:text-sm font-semibold",
        alert ? "text-[hsl(var(--dw-orange))]" : "text-foreground/80"
      )}>{value}</div>
    </div>
  );
}
