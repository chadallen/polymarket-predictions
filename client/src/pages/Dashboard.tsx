import { useState } from "react";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { MarketDetail } from "@/components/MarketDetail";
import { useMarkets, type DarkWatchMarket } from "@/hooks/use-markets";
import { formatCurrency, cn, getScoreColor, getScoreBg } from "@/lib/utils";
import { AlertCircle, Search, Filter } from "lucide-react";

export default function Dashboard() {
  const { data: markets, isLoading, isError } = useMarkets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredMarkets = (markets || []).filter(m => 
    m.question.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMarket = markets?.find(m => m.id === selectedId) || null;

  return (
    <div className="h-screen w-full flex flex-col relative bg-background text-foreground scanlines crt-flicker selection:bg-primary/30">
      <Header />
      
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center z-10">
          <div className="w-12 h-12 border-4 border-muted border-t-[hsl(var(--dw-orange))] rounded-full animate-spin mb-4" />
          <p className="font-mono-data uppercase tracking-widest text-muted-foreground animate-pulse">Establishing Uplink...</p>
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center z-10 text-[hsl(var(--dw-red))]">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="font-mono-data uppercase tracking-widest">Connection Severed</p>
        </div>
      ) : (
        <>
          <StatsBar markets={markets || []} />
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row z-10">
            {/* Market List Pane */}
            <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col h-full bg-background relative z-10">
              
              {/* Controls */}
              <div className="p-4 border-b border-border flex items-center gap-4 bg-card/20">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="QUERY SURVEILLANCE FEED..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded pl-9 pr-4 py-2 font-mono-data text-sm focus:outline-none focus:border-[hsl(var(--dw-blue))]/50 focus:ring-1 focus:ring-[hsl(var(--dw-blue))]/25 transition-all"
                  />
                </div>
                <button className="p-2 border border-border rounded hover:bg-white/5 transition-colors">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredMarkets.map(market => {
                  const isSelected = selectedId === market.id;
                  const score = market.riskProfile.score;
                  
                  return (
                    <button
                      key={market.id}
                      onClick={() => setSelectedId(market.id)}
                      className={cn(
                        "w-full text-left p-4 rounded border transition-all duration-200 group flex items-center gap-4",
                        isSelected 
                          ? "bg-white/5 border-primary/50 shadow-sm" 
                          : "bg-background border-border hover:border-primary/30 hover:bg-white/[0.02]"
                      )}
                    >
                      {/* Score Badge */}
                      <div className={cn(
                        "w-12 h-12 shrink-0 rounded flex items-center justify-center border",
                        getScoreBg(score)
                      )}>
                        <span className={cn("font-mono-data font-bold text-lg", getScoreColor(score))}>
                          {score}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {market.riskProfile.flags.length > 0 && (
                            <span className={cn(
                              "w-2 h-2 rounded-full animate-pulse",
                              market.riskProfile.flags[0].severity === 'CRITICAL' ? "bg-[hsl(var(--dw-red))]" :
                              market.riskProfile.flags[0].severity === 'HIGH' ? "bg-[hsl(var(--dw-orange))]" :
                              "bg-[hsl(var(--dw-yellow))]"
                            )} />
                          )}
                          <p className="font-medium truncate text-foreground group-hover:text-white transition-colors">
                            {market.question}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs font-mono-data text-muted-foreground">
                          <span>VOL: {formatCurrency(parseFloat(market.volume24hr || "0"))}/24h</span>
                          {market.riskProfile.volumeSpikeRatio > 1.5 && (
                            <span className="text-[hsl(var(--dw-orange))]">SPIKE: {market.riskProfile.volumeSpikeRatio.toFixed(1)}x</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                
                {filteredMarkets.length === 0 && (
                  <div className="text-center py-12 font-mono-data text-muted-foreground">
                    NO TARGETS MATCH QUERY
                  </div>
                )}
              </div>
            </div>

            {/* Detail Pane */}
            <div className="hidden md:block w-1/2 lg:w-2/5 h-full z-10 bg-background/90 backdrop-blur-sm">
              <MarketDetail market={selectedMarket} />
            </div>
            
            {/* Mobile Sheet equivalent (just keeping it simple via conditional rendering for demo, but normally use a drawer) */}
            <div className={cn(
              "md:hidden fixed inset-0 z-50 bg-background transition-transform duration-300",
              selectedId ? "translate-x-0" : "translate-x-full"
            )}>
              {selectedMarket && (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-border bg-card flex justify-between items-center">
                    <span className="font-mono-data font-bold">TARGET DETAIL</span>
                    <button onClick={() => setSelectedId(null)} className="font-mono-data text-sm px-3 py-1 border border-border rounded">BACK</button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MarketDetail market={selectedMarket} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
