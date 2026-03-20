import { useState, useMemo } from "react";
import { marked } from "marked";
import { Header } from "@/components/Header";
import { FeedCard } from "@/components/FeedCard";
import { useMarkets } from "@/hooks/use-markets";
import { useRecommend } from "@/hooks/use-recommend";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { AlertCircle, X, Sparkles, Terminal } from "lucide-react";

export default function Dashboard() {
  const { data: markets, isLoading, isError } = useMarkets();
  const [activeCategory, setActiveCategory] = useState<string | null>("politics");
  const [severityFilter, setSeverityFilter] = useState<"critical" | "high" | null>(null);
  const recommendMutation = useRecommend();

  const toggleCategory = (id: string) => {
    setActiveCategory(prev => prev === id ? null : id);
  };

  const toggleSeverity = (level: "critical" | "high") => {
    setSeverityFilter(prev => prev === level ? null : level);
  };

  const filtered = useMemo(() => {
    let result = markets || [];

    if (activeCategory) {
      result = result.filter(m =>
        m.categories.includes(activeCategory)
      );
    }

    if (severityFilter === "critical") {
      result = result.filter(m => m.riskProfile.score >= 70);
    } else if (severityFilter === "high") {
      result = result.filter(m => m.riskProfile.score >= 62 && m.riskProfile.score < 70);
    }

    return result;
  }, [markets, activeCategory, severityFilter]);

  const categoryCounts = useMemo(() => {
    const searchFiltered = markets || [];
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = searchFiltered.filter(m => m.categories.includes(cat.id)).length;
    }
    return counts;
  }, [markets]);

  const allFiltered = useMemo(() => {
    let result = markets || [];
    if (activeCategory) {
      result = result.filter(m => m.categories.includes(activeCategory));
    }
    return result;
  }, [markets, activeCategory]);

  const critical = allFiltered.filter(m => m.riskProfile.score >= 70).length;
  const high = allFiltered.filter(m => m.riskProfile.score >= 62 && m.riskProfile.score < 70).length;
  const totalVol = allFiltered.reduce((s, m) => s + parseFloat(m.volume24hr || "0"), 0);

  const handleRecommend = () => {
    if (!markets || markets.length === 0) return;
    let pool = markets;
    if (activeCategory) {
      pool = pool.filter(m => m.categories.includes(activeCategory));
    }
    const top3 = pool.slice(0, 10);
    if (top3.length === 0) return;
    recommendMutation.mutate({
      activeCategory: activeCategory || null,
      markets: top3.map(m => ({
        question: m.question,
        score: m.riskProfile.score,
        volume24hr: m.volume24hr || "0",
        volume: m.volume || "0",
        flags: m.riskProfile.flags.map(f => ({ name: f.name, severity: f.severity, points: f.points })),
        outcomePrices: m.outcomePrices,
        outcomes: m.outcomes,
        categories: m.categories,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 lg:py-32">
          <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-muted border-t-[hsl(var(--dw-orange))] rounded-full animate-spin mb-4 lg:mb-5" />
          <p className="font-label text-xs lg:text-sm uppercase text-muted-foreground animate-pulse">Scanning markets...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 lg:py-32 text-[hsl(var(--dw-red))]">
          <AlertCircle className="w-10 h-10 lg:w-12 lg:h-12 mb-3 lg:mb-4" />
          <p className="font-label text-xs lg:text-sm uppercase">Connection failed</p>
        </div>
      ) : (
        <div className="max-w-2xl lg:max-w-6xl mx-auto">
          <div className="sticky top-[53px] lg:top-[81px] z-40 bg-background/95 lg:bg-background backdrop-blur border-b border-border">
            <div className="grid grid-cols-3 divide-x divide-border text-center py-3 px-2 lg:py-5 lg:px-5">
              <button
                data-testid="button-severity-critical"
                onClick={() => toggleSeverity("critical")}
                className={`w-full min-h-[44px] lg:min-h-[56px] transition-colors rounded-sm py-1 lg:py-2 ${severityFilter === "critical" ? "bg-[hsl(var(--dw-red))]/10 ring-1 ring-[hsl(var(--dw-red))]/30 lg:bg-[hsl(var(--dw-red))]/25 lg:ring-[hsl(var(--dw-red))]" : "hover:bg-foreground/5"}`}
              >
                <div className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">Critical</div>
                <div className={`text-lg lg:text-3xl font-mono-data font-bold ${critical > 0 ? "text-[hsl(var(--dw-red))] text-glow-red" : "text-muted-foreground"}`}>{critical}</div>
              </button>
              <button
                data-testid="button-severity-high"
                onClick={() => toggleSeverity("high")}
                className={`w-full min-h-[44px] lg:min-h-[56px] transition-colors rounded-sm py-1 lg:py-2 ${severityFilter === "high" ? "bg-[hsl(var(--dw-orange))]/10 ring-1 ring-[hsl(var(--dw-orange))]/30 lg:bg-[hsl(var(--dw-orange))]/25 lg:ring-[hsl(var(--dw-orange))]" : "hover:bg-foreground/5"}`}
              >
                <div className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">High</div>
                <div className={`text-lg lg:text-3xl font-mono-data font-bold ${high > 0 ? "text-[hsl(var(--dw-orange))] text-glow-orange" : "text-muted-foreground"}`}>{high}</div>
              </button>
              <div className="py-1 lg:py-2 min-h-[44px] lg:min-h-[56px] flex flex-col justify-center">
                <div className="text-[10px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase">24h Vol</div>
                <div className="text-lg lg:text-3xl font-mono-data font-bold">{formatCurrency(totalVol)}</div>
              </div>
            </div>

            <div className="px-3 lg:px-5 pb-2 lg:pb-4 space-y-2 lg:space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 lg:gap-2.5 overflow-x-auto flex-1 scrollbar-none">
                  <button
                    data-testid="button-category-all"
                    onClick={() => setActiveCategory(null)}
                    className={`flex-shrink-0 px-3 lg:px-4 py-2 lg:py-2.5 min-h-[40px] lg:min-h-[44px] rounded text-xs lg:text-base font-label uppercase border transition-colors flex items-center ${
                      activeCategory === null
                        ? "border-foreground/30 lg:border-foreground text-foreground bg-foreground/5 lg:bg-foreground/15"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 lg:hover:border-foreground"
                    }`}
                  >
                    All
                    <span className="ml-1 lg:ml-1.5 opacity-60 lg:opacity-100">{(markets || []).length}</span>
                  </button>
                  {CATEGORIES.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        data-testid={`button-category-${cat.id}`}
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex-shrink-0 px-3 lg:px-4 py-2 lg:py-2.5 min-h-[40px] lg:min-h-[44px] rounded text-xs lg:text-base font-label uppercase border transition-colors flex items-center ${
                          !isActive ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 lg:hover:border-foreground" : ""
                        }`}
                        style={isActive ? {
                          borderColor: `hsl(${cat.color})`,
                          color: `hsl(${cat.color})`,
                          backgroundColor: `hsl(${cat.color} / 0.15)`,
                        } : {}}
                      >
                        {cat.label}
                        <span className="ml-1 lg:ml-1.5 opacity-60 lg:opacity-100">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-3">
                <button
                  data-testid="button-ai-recommend"
                  onClick={handleRecommend}
                  disabled={recommendMutation.isPending}
                  className={`flex-1 py-2 lg:py-3 rounded border text-xs lg:text-base font-label uppercase transition-colors flex items-center justify-center gap-2 ${
                    recommendMutation.isPending
                      ? "border-[hsl(var(--dw-blue))]/20 text-[hsl(var(--dw-blue))]/50 lg:border-[hsl(var(--dw-blue))] lg:text-[hsl(var(--dw-blue))] cursor-wait"
                      : "border-[hsl(var(--dw-blue))]/30 lg:border-[hsl(var(--dw-blue))] text-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/5 lg:bg-[hsl(var(--dw-blue))]/25 hover:bg-[hsl(var(--dw-blue))]/10 lg:hover:bg-[hsl(var(--dw-blue))]/35"
                  }`}
                >
                  {recommendMutation.isPending ? (
                    <>
                      <span className="w-3 h-3 lg:w-4 lg:h-4 border border-t-transparent border-[hsl(var(--dw-blue))] rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" />
                      Get Trade Signals
                    </>
                  )}
                </button>
              </div>

              {recommendMutation.data && (
                <div data-testid="panel-ai-recommendation" className="border border-[hsl(var(--dw-blue))]/20 lg:border-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/[0.03] lg:bg-[hsl(var(--dw-blue))]/20 rounded p-3 lg:p-5 max-h-[40vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2 lg:mb-3 sticky top-0 bg-[hsl(var(--dw-blue))]/[0.03] lg:bg-transparent pb-1">
                    <div className="text-[10px] lg:text-sm font-label text-[hsl(var(--dw-blue))] uppercase flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 lg:w-4 lg:h-4" /> Top Trade Signals
                    </div>
                    <button
                      data-testid="button-close-recommendation"
                      onClick={() => recommendMutation.reset()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3 lg:w-4 lg:h-4" />
                    </button>
                  </div>
                  <div
                    className="text-xs lg:text-base leading-relaxed text-foreground/85 lg:text-foreground font-mono-data prose prose-invert prose-xs lg:prose-base max-w-none [&_p]:my-1 lg:[&_p]:my-2 [&_ul]:my-1 lg:[&_ul]:my-2 [&_ol]:my-1 lg:[&_ol]:my-2 [&_li]:my-0.5 lg:[&_li]:my-1 [&_strong]:text-foreground [&_hr]:border-border/30 lg:[&_hr]:border-border [&_hr]:my-2 lg:[&_hr]:my-3"
                    dangerouslySetInnerHTML={{ __html: marked.parse(recommendMutation.data.recommendation, { async: false }) as string }}
                  />
                </div>
              )}

              {recommendMutation.isError && (
                <div data-testid="text-recommendation-error" className="p-3 lg:p-4 rounded border border-[hsl(var(--dw-red))]/20 lg:border-[hsl(var(--dw-red))] bg-[hsl(var(--dw-red))]/5 lg:bg-[hsl(var(--dw-red))]/25 text-[hsl(var(--dw-red))] font-mono-data text-xs lg:text-base">
                  {recommendMutation.error?.message || "Recommendation failed. Check connection."}
                </div>
              )}
            </div>
          </div>

          <div className="px-3 lg:px-5 pt-3 lg:pt-5">
            <div className="rounded border border-[hsl(var(--dw-orange))]/20 bg-[hsl(var(--dw-orange))]/[0.04] px-3 lg:px-5 py-2.5 lg:py-3 flex items-start gap-2.5 lg:gap-3">
              <span className="text-[hsl(var(--dw-orange))] text-base lg:text-xl leading-none mt-0.5">→</span>
              <p className="text-[11px] lg:text-sm font-mono-data text-muted-foreground leading-relaxed">
                <span className="text-foreground/80 font-semibold">When insiders bet big on Polymarket, real markets follow.</span>
                {" "}We surface unusual trading patterns before the news breaks — expand any market and hit <span className="text-[hsl(var(--dw-blue))]">Find the Trade</span> to get an AI-generated real-world trade recommendation.
              </p>
            </div>
          </div>

          <div className="p-3 lg:p-5 space-y-2 lg:space-y-4 pb-20">
            {filtered.length === 0 ? (
              <div className="text-center py-16 lg:py-20 font-label text-xs lg:text-base text-muted-foreground uppercase">
                No markets match query
              </div>
            ) : (
              filtered.map((market, i) => (
                <FeedCard key={market.id} market={market} rank={i + 1} />
              ))
            )}
          </div>

          <div className="text-center py-4 lg:py-6 text-[10px] lg:text-sm font-label text-muted-foreground/50 lg:text-muted-foreground uppercase">
            {filtered.length} markets monitored · VPIN model · refreshing every 30s
          </div>
        </div>
      )}
    </div>
  );
}
