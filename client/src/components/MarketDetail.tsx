import { type DarkWatchMarket } from "@/hooks/use-markets";
import { useTrades } from "@/hooks/use-trades";
import { useAnalyze } from "@/hooks/use-analyze";
import { ScoreGauge } from "./ScoreGauge";
import { formatCurrency, formatCents, cn, getScoreColor, getScoreBg } from "@/lib/utils";
import { ExternalLink, Terminal, Shield, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MarketDetailProps {
  market: DarkWatchMarket | null;
}

export function MarketDetail({ market }: MarketDetailProps) {
  const { data: trades, isLoading: tradesLoading } = useTrades(market?.id || null);
  const analyzeMutation = useAnalyze();

  if (!market) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-l border-border bg-card/30 p-6">
        <Terminal className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-mono-data text-sm uppercase tracking-widest">Awaiting Target Selection...</p>
      </div>
    );
  }

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      marketId: market.id,
      title: market.question,
      description: `Market ends: ${market.endDate}. Current volume: ${market.volume}`,
      score: market.riskProfile.score,
      flags: market.riskProfile.flags.map(f => ({
        name: f.name,
        severity: f.severity,
        points: f.points
      })),
      recentTrades: trades?.slice(0, 10).map(t => ({
        price: t.price,
        size: t.size,
        side: t.side,
        timestamp: t.timestamp
      }))
    });
  };

  return (
    <div className="h-full flex flex-col border-l border-border bg-card/30 overflow-hidden relative">
      {/* Target Header */}
      <div className="p-6 border-b border-border shrink-0 bg-background/50">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-widest">
                Target ID: {market.id.substring(0, 8)}
              </span>
            </div>
            <h2 className="text-lg font-medium leading-snug">{market.question}</h2>
          </div>
          <a 
            href={`https://polymarket.com/event/${market.slug}`} 
            target="_blank" 
            rel="noreferrer"
            className="p-2 rounded hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Score & Core Stats */}
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="shrink-0">
            <ScoreGauge score={market.riskProfile.score} size={140} />
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1 w-full">
            <StatBlock icon={<Activity className="w-4 h-4"/>} label="24H Volume" value={formatCurrency(parseFloat(market.volume24hr || "0"))} />
            <StatBlock icon={<TrendingUp className="w-4 h-4"/>} label="Vol Spike" value={`${market.riskProfile.volumeSpikeRatio.toFixed(1)}x avg`} />
            <StatBlock icon={<Activity className="w-4 h-4"/>} label="Total Vol" value={formatCurrency(parseFloat(market.volume || "0"))} />
            <StatBlock icon={<TrendingUp className="w-4 h-4"/>} label="Top Price" value={market.outcomePrices?.[0] ? formatCents(parseFloat(market.outcomePrices[0])) : "--"} />
          </div>
        </div>

        {/* Detection Flags */}
        <div>
          <h3 className="text-xs font-mono-data text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Detection Flags
          </h3>
          <div className="space-y-2">
            {market.riskProfile.flags.length > 0 ? (
              market.riskProfile.flags.map((flag, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-background/50 border border-border">
                  <span className="text-sm font-mono-data">{flag.name}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded font-mono-data uppercase tracking-wider",
                    flag.severity === "CRITICAL" ? "bg-[hsl(var(--dw-red))]/20 text-[hsl(var(--dw-red))] border border-[hsl(var(--dw-red))]/30" :
                    flag.severity === "HIGH" ? "bg-[hsl(var(--dw-orange))]/20 text-[hsl(var(--dw-orange))] border border-[hsl(var(--dw-orange))]/30" :
                    "bg-[hsl(var(--dw-yellow))]/20 text-[hsl(var(--dw-yellow))] border border-[hsl(var(--dw-yellow))]/30"
                  )}>
                    {flag.severity} (+{flag.points})
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-background/20 rounded border border-border border-dashed font-mono-data">
                NO ANOMALIES DETECTED
              </div>
            )}
          </div>
        </div>

        {/* CLOB Trades */}
        <div>
          <h3 className="text-xs font-mono-data text-muted-foreground uppercase tracking-widest mb-4">Live Trade Intercept</h3>
          {tradesLoading ? (
            <div className="h-32 flex items-center justify-center border border-border border-dashed rounded bg-background/20">
              <span className="font-mono-data text-sm text-muted-foreground animate-pulse">Decrypting feed...</span>
            </div>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm font-mono-data text-left">
                <thead className="bg-muted/50 border-b border-border text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-normal">Time</th>
                    <th className="px-4 py-2 font-normal">Side</th>
                    <th className="px-4 py-2 font-normal">Size</th>
                    <th className="px-4 py-2 font-normal">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {trades?.slice(0, 8).map((t, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-muted-foreground">{t.timestamp.substring(11, 19)}</td>
                      <td className={cn("px-4 py-2", t.side === "BUY" ? "text-[hsl(var(--dw-green))]" : "text-[hsl(var(--dw-red))]")}>
                        {t.side}
                      </td>
                      <td className="px-4 py-2">{t.size.toLocaleString()}</td>
                      <td className="px-4 py-2">{formatCents(t.price)}</td>
                    </tr>
                  ))}
                  {trades?.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">NO RECENT TRADES</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Analysis Section */}
        <div className="pt-4 border-t border-border">
          {!analyzeMutation.data && !analyzeMutation.isPending && (
            <button
              onClick={handleAnalyze}
              className="w-full py-4 rounded font-mono-data text-sm tracking-widest uppercase transition-all duration-300 bg-[hsl(var(--dw-blue))]/10 text-[hsl(var(--dw-blue))] border border-[hsl(var(--dw-blue))]/30 hover:bg-[hsl(var(--dw-blue))]/20 hover:shadow-[0_0_15px_rgba(80,160,255,0.2)]"
            >
              Initialize Claude AI Assessment
            </button>
          )}

          {analyzeMutation.isPending && (
            <div className="p-6 rounded border border-border bg-background/50 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-[hsl(var(--dw-blue))] animate-spin" />
              <p className="font-mono-data text-sm text-[hsl(var(--dw-blue))] animate-pulse">Neural synthesis in progress...</p>
            </div>
          )}

          {analyzeMutation.data && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded border border-[hsl(var(--dw-blue))]/30 bg-[hsl(var(--dw-blue))]/5 relative"
            >
              <h4 className="text-[10px] font-mono-data text-[hsl(var(--dw-blue))] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Claude Synthesis
              </h4>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90 font-mono-data whitespace-pre-wrap">
                {analyzeMutation.data.analysis}
              </div>
            </motion.div>
          )}

          {analyzeMutation.isError && (
            <div className="p-4 rounded border border-[hsl(var(--dw-red))]/30 bg-[hsl(var(--dw-red))]/10 text-[hsl(var(--dw-red))] font-mono-data text-sm">
              ERROR: Failed to establish neural link. Verify API endpoint status.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-3 bg-background/50 border border-border rounded flex flex-col">
      <div className="flex items-center gap-1.5 text-[10px] font-mono-data text-muted-foreground uppercase tracking-widest mb-1">
        {icon} {label}
      </div>
      <div className="font-mono-data text-base">{value}</div>
    </div>
  );
}
