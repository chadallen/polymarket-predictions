import { useEffect, useState } from "react";
import { Activity, ShieldAlert } from "lucide-react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur z-40 flex items-center px-6 justify-between relative shrink-0">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-[hsl(var(--dw-red))]" />
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-foreground">DARK</span>
          <span className="text-[hsl(var(--dw-orange))] text-glow-orange">WATCH</span>
        </h1>
        <div className="ml-4 px-2 py-0.5 rounded bg-[hsl(var(--dw-red))]/10 border border-[hsl(var(--dw-red))]/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--dw-red))] animate-pulse" />
          <span className="text-xs font-mono-data text-[hsl(var(--dw-red))] uppercase tracking-wider">Live Intel</span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm font-mono-data text-muted-foreground">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>SYS.OP.NORMAL</span>
        </div>
        <div className="tabular-nums">
          {time.toISOString().replace('T', ' ').substring(0, 19)} UTC
        </div>
      </div>
    </header>
  );
}
