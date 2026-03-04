import { useState } from "react";
import { Header } from "@/components/Header";
import { FeedCard } from "@/components/FeedCard";
import { useMarkets } from "@/hooks/use-markets";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Search } from "lucide-react";

export default function Dashboard() {
  const { data: markets, isLoading, isError } = useMarkets();
  const [search, setSearch] = useState("");

  const filtered = (markets || []).filter(m =>
    m.question.toLowerCase().includes(search.toLowerCase())
  );

  const critical = filtered.filter(m => m.riskProfile.score >= 80).length;
  const high = filtered.filter(m => m.riskProfile.score >= 55 && m.riskProfile.score < 80).length;
  const totalVol = filtered.reduce((s, m) => s + parseFloat(m.volume24hr || "0"), 0);

  return (
    <div className="min-h-screen bg-background text-foreground scanlines">
      <Header />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-muted border-t-[hsl(var(--dw-orange))] rounded-full animate-spin mb-4" />
          <p className="font-mono-data text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Scanning markets...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-[hsl(var(--dw-red))]">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="font-mono-data text-xs uppercase tracking-widest">Connection failed</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="sticky top-[53px] z-40 bg-background/95 backdrop-blur border-b border-border">
            <div className="grid grid-cols-3 divide-x divide-border text-center py-2 px-2">
              <div>
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">Critical</div>
                <div className={`text-base font-mono-data font-bold ${critical > 0 ? "text-[hsl(var(--dw-red))] text-glow-red" : "text-muted-foreground"}`}>{critical}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">High</div>
                <div className={`text-base font-mono-data font-bold ${high > 0 ? "text-[hsl(var(--dw-orange))] text-glow-orange" : "text-muted-foreground"}`}>{high}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">24h Vol</div>
                <div className="text-base font-mono-data font-bold">{formatCurrency(totalVol)}</div>
              </div>
            </div>

            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  data-testid="input-search"
                  type="text"
                  placeholder="Filter markets..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded pl-8 pr-3 py-2 text-sm font-mono-data focus:outline-none focus:border-[hsl(var(--dw-blue))]/40 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2 pb-20">
            {filtered.length === 0 ? (
              <div className="text-center py-16 font-mono-data text-xs text-muted-foreground uppercase tracking-widest">
                No markets match query
              </div>
            ) : (
              filtered.map((market, i) => (
                <FeedCard key={market.id} market={market} rank={i + 1} />
              ))
            )}
          </div>

          <div className="text-center py-4 text-[10px] font-mono-data text-muted-foreground/50 uppercase tracking-widest">
            {filtered.length} markets monitored · refreshing every 30s
          </div>
        </div>
      )}
    </div>
  );
}
