import { useState } from "react";
import { marked } from "marked";
import { type DarkWatchMarket } from "@/hooks/use-markets";
import { useTrades } from "@/hooks/use-trades";
import { useAnalyze } from "@/hooks/use-analyze";
import { ScoreGauge } from "./ScoreGauge";
import { formatCurrency, formatCents, cn, getScoreColor, getScoreBg } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, Activity, Zap, Terminal } from "lucide-react";

interface FeedCardProps {
  market: DarkWatchMarket;
  rank: number;
}

export function FeedCard({ market, rank }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: trades, isLoading: tradesLoading } = useTrades(expanded ? market.id : null);
  const analyzeMutation = useAnalyze();
  const isMock = market.id.startsWith("mock-");

  const score = market.riskProfile.score;
  const flags = market.riskProfile.flags;

  const severityLabel = score >= 63 ? "CRITICAL" : score >= 58 ? "HIGH" : score >= 30 ? "MODERATE" : "LOW";

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    analyzeMutation.mutate({
      marketId: market.id,
      title: market.question,
      description: `Market ends: ${market.endDate}. Current volume: ${market.volume}`,
      score,
      flags: flags.map(f => ({ name: f.name, severity: f.severity, points: f.points })),
      recentTrades: trades?.slice(0, 10).map(t => ({
        price: t.price,
        size: t.size,
        side: t.side,
        timestamp: t.timestamp,
      })),
    });
  };

  const vol24 = parseFloat(market.volume24hr || "0");
  const volTotal = parseFloat(market.volume || "0");
  const topPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : null;
  const topOutcome = market.outcomes?.[0] || "Yes";

  return (
    <div
      data-testid={`feed-card-${market.id}`}
      className={cn(
        "border rounded-md",
        score >= 63 ? "border-[hsl(var(--dw-red))]/30 bg-[hsl(var(--dw-red))]/[0.03]" :
        score >= 58 ? "border-[hsl(var(--dw-orange))]/20 bg-[hsl(var(--dw-orange))]/[0.02]" :
        "border-border bg-card/40"
      )}
    >
      <div
        data-testid={`feed-card-toggle-${market.id}`}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
        className="w-full text-left p-4 flex gap-3 cursor-pointer select-none active:opacity-80"
      >
        <div className={cn(
          "w-12 h-12 shrink-0 rounded flex flex-col items-center justify-center border",
          getScoreBg(score)
        )}>
          <span className={cn("font-mono-data font-bold text-lg leading-none", getScoreColor(score))}>
            {score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug line-clamp-2">
              {isMock && <span className="text-[9px] font-mono-data text-muted-foreground bg-muted px-1 py-0.5 rounded mr-1.5 uppercase">Simulated</span>}
              {market.question}
            </p>
            {expanded ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />}
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-mono-data uppercase tracking-wider",
              score >= 63 ? "bg-[hsl(var(--dw-red))]/15 text-[hsl(var(--dw-red))]" :
              score >= 58 ? "bg-[hsl(var(--dw-orange))]/15 text-[hsl(var(--dw-orange))]" :
              score >= 30 ? "bg-[hsl(var(--dw-yellow))]/15 text-[hsl(var(--dw-yellow))]" :
              "bg-[hsl(var(--dw-green))]/15 text-[hsl(var(--dw-green))]"
            )}>
              {severityLabel}
            </span>
            <span className="text-[11px] font-mono-data text-muted-foreground">{formatCurrency(vol24)}/24h</span>
            {market.riskProfile.volumeSpikeRatio > 1.5 && (
              <span className="text-[11px] font-mono-data text-[hsl(var(--dw-orange))]">
                {market.riskProfile.volumeSpikeRatio.toFixed(1)}x spike
              </span>
            )}
            {topPrice !== null && (
              <span className="text-[11px] font-mono-data text-muted-foreground">
                {topOutcome} {formatCents(topPrice)}
              </span>
            )}
            {flags.length > 0 && (
              <span className="text-[11px] font-mono-data text-muted-foreground">{flags.length} flag{flags.length !== 1 ? 's' : ''}</span>
            )}
            {market.categories.filter(c => c !== "other").map(catId => {
              const cat = CATEGORIES.find(c => c.id === catId);
              if (!cat) return null;
              return (
                <span
                  key={catId}
                  data-testid={`badge-category-${catId}-${market.id}`}
                  className="text-[9px] px-1 py-0.5 rounded font-mono-data uppercase tracking-wider border"
                  style={{
                    borderColor: `hsl(${cat.color} / 0.2)`,
                    color: `hsl(${cat.color} / 0.8)`,
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
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">

          <div className="flex items-center gap-4">
            <ScoreGauge score={score} size={80} />
            <div className="grid grid-cols-2 gap-2 flex-1">
              <Stat icon={<Activity className="w-3 h-3" />} label="24h Vol" value={formatCurrency(vol24)} />
              <Stat icon={<TrendingUp className="w-3 h-3" />} label="Spike" value={`${market.riskProfile.volumeSpikeRatio.toFixed(1)}x`} />
              <Stat icon={<Activity className="w-3 h-3" />} label="Total Vol" value={formatCurrency(volTotal)} />
              <Stat icon={<Zap className="w-3 h-3" />} label="Flags" value={`${flags.length}`} />
            </div>
          </div>

          {topPrice !== null && (
            <div className="flex items-center gap-2 text-sm font-mono-data flex-wrap">
              <span className="text-muted-foreground text-xs">Outcomes:</span>
              {market.outcomes?.map((o, i) => {
                const p = market.outcomePrices?.[i] ? parseFloat(market.outcomePrices[i]) : 0;
                return (
                  <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded text-xs">
                    {o} {formatCents(p)}
                  </span>
                );
              })}
            </div>
          )}

          {flags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-widest">Detection Flags</span>
              {flags.map((flag, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded bg-background/60 border border-border/50 text-xs font-mono-data">
                  <span className="truncate mr-2">{flag.name}</span>
                  <span className={cn(
                    "shrink-0 px-1.5 py-0.5 rounded uppercase text-[9px] tracking-wider",
                    flag.severity === "CRITICAL" ? "bg-[hsl(var(--dw-red))]/15 text-[hsl(var(--dw-red))]" :
                    flag.severity === "HIGH" ? "bg-[hsl(var(--dw-orange))]/15 text-[hsl(var(--dw-orange))]" :
                    "bg-[hsl(var(--dw-yellow))]/15 text-[hsl(var(--dw-yellow))]"
                  )}>
                    {flag.severity} +{flag.points}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-widest">Recent Trades</span>
            {tradesLoading ? (
              <div className="py-4 text-center text-xs font-mono-data text-muted-foreground animate-pulse">Loading trades...</div>
            ) : trades && trades.length > 0 ? (
              <div className="space-y-1">
                {trades.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-background/40 text-[11px] font-mono-data">
                    <span className={cn(
                      "w-8",
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
              <div className="py-3 text-center text-xs font-mono-data text-muted-foreground">No recent trades</div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={`https://polymarket.com/event/${market.eventSlug || market.events?.[0]?.slug || market.slug}`}
              target="_blank"
              rel="noreferrer"
              data-testid={`link-polymarket-${market.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-xs font-mono-data uppercase tracking-wider border border-border text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              Polymarket
            </a>
            {!isMock && (
              <button
                data-testid={`button-analyze-${market.id}`}
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className={cn(
                  "flex-1 py-2.5 rounded text-xs font-mono-data uppercase tracking-wider border transition-colors",
                  analyzeMutation.isPending
                    ? "border-[hsl(var(--dw-blue))]/20 text-[hsl(var(--dw-blue))]/50 cursor-wait"
                    : "border-[hsl(var(--dw-blue))]/30 text-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/5"
                )}
              >
                {analyzeMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-t-transparent border-[hsl(var(--dw-blue))] rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Terminal className="w-3 h-3" />
                    AI Analysis
                  </span>
                )}
              </button>
            )}
          </div>

          {analyzeMutation.data && (
            <div className="p-3 rounded border border-[hsl(var(--dw-blue))]/20 bg-[hsl(var(--dw-blue))]/[0.03]">
              <div className="text-[10px] font-mono-data text-[hsl(var(--dw-blue))] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Claude Assessment
              </div>
              <div
                className="text-xs leading-relaxed text-foreground/85 font-mono-data prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground [&_hr]:border-border/30 [&_hr]:my-2"
                dangerouslySetInnerHTML={{ __html: marked.parse(analyzeMutation.data.analysis, { async: false }) as string }}
              </div>
            </div>
          )}

          {analyzeMutation.isError && (
            <div data-testid="text-analysis-error" className="p-3 rounded border border-[hsl(var(--dw-red))]/20 bg-[hsl(var(--dw-red))]/5 text-[hsl(var(--dw-red))] font-mono-data text-xs">
              {analyzeMutation.error?.message || "Analysis failed. Check connection."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2 bg-background/50 rounded border border-border/50">
      <div className="flex items-center gap-1 text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest mb-0.5">
        {icon} {label}
      </div>
      <div className="font-mono-data text-xs">{value}</div>
    </div>
  );
}
