import { useState, useMemo, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { FeedCard } from "@/components/FeedCard";
import { ScoringToggle, ScoringPanelBody } from "@/components/ScoringPanel";
import { useMarkets } from "@/hooks/use-markets";
import { useRecommend } from "@/hooks/use-recommend";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { type ScoringWeights, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { AlertCircle, Search, X, Sparkles, Terminal } from "lucide-react";

export default function Dashboard() {
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_WEIGHTS });
  const [scoringOpen, setScoringOpen] = useState(false);
  const { data: markets, isLoading, isError } = useMarkets(weights);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"critical" | "high" | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recommendMutation = useRecommend();

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const closeSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  const toggleCategory = (id: string) => {
    setActiveCategory(prev => prev === id ? null : id);
  };

  const toggleSeverity = (level: "critical" | "high") => {
    setSeverityFilter(prev => prev === level ? null : level);
  };

  const filtered = useMemo(() => {
    let result = markets || [];

    if (search) {
      result = result.filter(m =>
        m.question.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activeCategory) {
      result = result.filter(m =>
        m.categories.includes(activeCategory)
      );
    }

    if (severityFilter === "critical") {
      result = result.filter(m => m.riskProfile.score >= 63);
    } else if (severityFilter === "high") {
      result = result.filter(m => m.riskProfile.score >= 58 && m.riskProfile.score < 63);
    }

    return result;
  }, [markets, search, activeCategory, severityFilter]);

  const categoryCounts = useMemo(() => {
    const searchFiltered = (markets || []).filter(m =>
      !search || m.question.toLowerCase().includes(search.toLowerCase())
    );
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.id] = searchFiltered.filter(m => m.categories.includes(cat.id)).length;
    }
    return counts;
  }, [markets, search]);

  const allFiltered = useMemo(() => {
    let result = markets || [];
    if (search) {
      result = result.filter(m => m.question.toLowerCase().includes(search.toLowerCase()));
    }
    if (activeCategory) {
      result = result.filter(m => m.categories.includes(activeCategory));
    }
    return result;
  }, [markets, search, activeCategory]);

  const critical = allFiltered.filter(m => m.riskProfile.score >= 63).length;
  const high = allFiltered.filter(m => m.riskProfile.score >= 58 && m.riskProfile.score < 63).length;
  const totalVol = allFiltered.reduce((s, m) => s + parseFloat(m.volume24hr || "0"), 0);

  const handleRecommend = () => {
    if (!markets || markets.length === 0) return;
    const top25 = markets.slice(0, 25);
    recommendMutation.mutate({
      markets: top25.map(m => ({
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
              <button
                data-testid="button-severity-critical"
                onClick={() => toggleSeverity("critical")}
                className={`transition-colors rounded-sm ${severityFilter === "critical" ? "bg-[hsl(var(--dw-red))]/10 ring-1 ring-[hsl(var(--dw-red))]/30" : "hover:bg-foreground/5"}`}
              >
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">Critical</div>
                <div className={`text-base font-mono-data font-bold ${critical > 0 ? "text-[hsl(var(--dw-red))] text-glow-red" : "text-muted-foreground"}`}>{critical}</div>
              </button>
              <button
                data-testid="button-severity-high"
                onClick={() => toggleSeverity("high")}
                className={`transition-colors rounded-sm ${severityFilter === "high" ? "bg-[hsl(var(--dw-orange))]/10 ring-1 ring-[hsl(var(--dw-orange))]/30" : "hover:bg-foreground/5"}`}
              >
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">High</div>
                <div className={`text-base font-mono-data font-bold ${high > 0 ? "text-[hsl(var(--dw-orange))] text-glow-orange" : "text-muted-foreground"}`}>{high}</div>
              </button>
              <div>
                <div className="text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">24h Vol</div>
                <div className="text-base font-mono-data font-bold">{formatCurrency(totalVol)}</div>
              </div>
            </div>

            <div className="px-3 pb-2 space-y-2">
              <button
                data-testid="button-ai-recommend"
                onClick={handleRecommend}
                disabled={recommendMutation.isPending}
                className={`w-full py-2 rounded border text-xs font-mono-data uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  recommendMutation.isPending
                    ? "border-[hsl(var(--dw-blue))]/20 text-[hsl(var(--dw-blue))]/50 cursor-wait"
                    : "border-[hsl(var(--dw-blue))]/30 text-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/5 hover:bg-[hsl(var(--dw-blue))]/10"
                }`}
              >
                {recommendMutation.isPending ? (
                  <>
                    <span className="w-3 h-3 border border-t-transparent border-[hsl(var(--dw-blue))] rounded-full animate-spin" />
                    Analyzing top 25 markets...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    AI Recommendation
                  </>
                )}
              </button>

              {recommendMutation.data && (
                <div data-testid="panel-ai-recommendation" className="border border-[hsl(var(--dw-blue))]/20 bg-[hsl(var(--dw-blue))]/[0.03] rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono-data text-[hsl(var(--dw-blue))] uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="w-3 h-3" /> Intelligence Briefing
                    </div>
                    <button
                      data-testid="button-close-recommendation"
                      onClick={() => recommendMutation.reset()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs leading-relaxed text-foreground/85 font-mono-data whitespace-pre-wrap">
                    {recommendMutation.data.recommendation}
                  </div>
                </div>
              )}

              {recommendMutation.isError && (
                <div data-testid="text-recommendation-error" className="p-3 rounded border border-[hsl(var(--dw-red))]/20 bg-[hsl(var(--dw-red))]/5 text-[hsl(var(--dw-red))] font-mono-data text-xs">
                  {recommendMutation.error?.message || "Recommendation failed. Check connection."}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 overflow-x-auto flex-1 scrollbar-none">
                  <button
                    data-testid="button-category-all"
                    onClick={() => setActiveCategory(null)}
                    className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-mono-data uppercase tracking-wider border transition-colors ${
                      activeCategory === null
                        ? "border-foreground/30 text-foreground bg-foreground/5"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                    }`}
                  >
                    All
                    <span className="ml-1 opacity-60">{(markets || []).length}</span>
                  </button>
                  {CATEGORIES.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        data-testid={`button-category-${cat.id}`}
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-mono-data uppercase tracking-wider border transition-colors ${
                          !isActive ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20" : ""
                        }`}
                        style={isActive ? {
                          borderColor: `hsl(${cat.color} / 0.4)`,
                          color: `hsl(${cat.color})`,
                          backgroundColor: `hsl(${cat.color} / 0.05)`,
                        } : {}}
                      >
                        {cat.label}
                        <span className="ml-1 opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  data-testid="button-search-toggle"
                  onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-mono-data uppercase tracking-wider transition-colors ${
                    searchOpen || search
                      ? "border-[hsl(var(--dw-blue))]/40 text-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/5"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  <Search className="w-3 h-3" />
                  Search
                </button>
              </div>

              {searchOpen && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    data-testid="input-search"
                    type="text"
                    placeholder="Filter markets..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-card border border-border rounded pl-7 pr-8 py-1.5 text-xs font-mono-data focus:outline-none focus:border-[hsl(var(--dw-blue))]/40 transition-colors"
                  />
                  <button
                    data-testid="button-search-close"
                    onClick={closeSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex justify-center">
                <ScoringToggle
                  isOpen={scoringOpen}
                  isModified={Object.keys(DEFAULT_WEIGHTS).some(k => Math.abs(weights[k as keyof ScoringWeights] - DEFAULT_WEIGHTS[k as keyof ScoringWeights]) > 0.05)}
                  onToggle={() => setScoringOpen(!scoringOpen)}
                />
              </div>

              {scoringOpen && (
                <ScoringPanelBody weights={weights} onChange={setWeights} />
              )}
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
