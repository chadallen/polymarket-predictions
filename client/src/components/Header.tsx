import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header data-testid="header" className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[hsl(var(--dw-red))]" />
          <div>
            <h1 className="text-base font-bold font-mono-data tracking-tight leading-none">
              <span className="text-foreground">DARK</span>
              <span className="text-[hsl(var(--dw-orange))] text-glow-orange">WATCH</span>
            </h1>
            <p className="text-[11px] font-mono-data text-muted-foreground uppercase tracking-widest leading-none mt-0.5">detecting insider trades on betting markets</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[hsl(var(--dw-red))]/10 border border-[hsl(var(--dw-red))]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--dw-red))] animate-pulse" />
            <span className="text-[10px] font-mono-data text-[hsl(var(--dw-red))] uppercase tracking-wider">Live</span>
          </div>
          <span className="text-[10px] font-mono-data text-muted-foreground tabular-nums hidden sm:block">
            {time.toISOString().replace('T', ' ').substring(0, 19)}Z
          </span>
        </div>
      </div>
    </header>
  );
}
