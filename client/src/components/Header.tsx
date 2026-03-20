import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header data-testid="header" className="sticky top-0 z-50 bg-background/95 lg:bg-background backdrop-blur border-b border-border px-4 py-3 lg:px-10 lg:py-5">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <ShieldAlert className="w-4 h-4 lg:w-6 lg:h-6 text-[hsl(var(--dw-orange))]" />
          <div>
            <h1 className="text-base lg:text-2xl font-bold font-mono-data tracking-tight leading-none">
              <span className="text-foreground">Polymarket</span>
              <span className="text-[hsl(var(--dw-orange))] text-glow-orange"> Predictions</span>
            </h1>
            <p className="text-[11px] lg:text-sm font-label lg:font-semibold text-muted-foreground uppercase leading-none mt-0.5 lg:mt-1">insider signals <span className="text-[hsl(var(--dw-orange))]">→</span> real-world trades</p>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          <div className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-0.5 lg:py-1 rounded bg-[hsl(var(--dw-red))]/10 lg:bg-[hsl(var(--dw-red))]/25 border border-[hsl(var(--dw-red))]/30 lg:border-[hsl(var(--dw-red))]">
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[hsl(var(--dw-red))] animate-pulse" />
            <span className="text-[10px] lg:text-sm font-label font-semibold text-[hsl(var(--dw-red))] uppercase">Live</span>
          </div>
          <span className="text-[10px] lg:text-sm font-mono-data text-muted-foreground tabular-nums hidden sm:block">
            {time.toISOString().replace('T', ' ').substring(0, 19)}Z
          </span>
        </div>
      </div>
    </header>
  );
}
