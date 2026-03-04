import { type DarkWatchMarket } from "@/hooks/use-markets";
import { formatCurrency } from "@/lib/utils";

interface StatsBarProps {
  markets: DarkWatchMarket[];
}

export function StatsBar({ markets }: StatsBarProps) {
  const totalVolume = markets.reduce((acc, m) => acc + parseFloat(m.volume24hr || "0"), 0);
  const avgScore = markets.length > 0 
    ? Math.round(markets.reduce((acc, m) => acc + m.riskProfile.score, 0) / markets.length)
    : 0;
  
  const critical = markets.filter(m => m.riskProfile.score >= 80).length;
  const high = markets.filter(m => m.riskProfile.score >= 55 && m.riskProfile.score < 80).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border-b border-border shrink-0">
      <StatBox label="Monitored Markets" value={markets.length} />
      <StatBox 
        label="Critical Alerts" 
        value={critical} 
        valueClass={critical > 0 ? "text-[hsl(var(--dw-red))] text-glow-red" : ""}
      />
      <StatBox 
        label="High Risk" 
        value={high} 
        valueClass={high > 0 ? "text-[hsl(var(--dw-orange))] text-glow-orange" : ""}
      />
      <StatBox label="24h Geo Volume" value={formatCurrency(totalVolume)} />
      <StatBox label="Avg Risk Index" value={avgScore} />
    </div>
  );
}

function StatBox({ label, value, valueClass = "text-foreground" }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="bg-background p-4 flex flex-col justify-center">
      <span className="text-[10px] text-muted-foreground font-mono-data uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-2xl font-mono-data font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
