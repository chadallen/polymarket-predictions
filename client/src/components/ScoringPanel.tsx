import { useState } from "react";
import { RotateCcw, ChevronDown, ChevronUp, HelpCircle, X } from "lucide-react";
import { type ScoringWeights, type ScoringCategory, DEFAULT_WEIGHTS, WEIGHT_LABELS } from "@/lib/scoring";

interface ScoringToggleProps {
  isOpen: boolean;
  isModified: boolean;
  onToggle: () => void;
}

interface ScoringPanelBodyProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

const SCORING_CATEGORIES: ScoringCategory[] = ["volumeSpike", "concentration", "baseline", "timeDecay", "convergence"];

const HELP_INFO: Record<ScoringCategory, { title: string; detail: string }> = {
  volumeSpike: {
    title: "Volume Spike",
    detail: "Measures how unusual today's trading volume is compared to the market's actual historical daily average (based on market age). Also factors in absolute dollar volume and weekly price momentum.",
  },
  concentration: {
    title: "Concentration",
    detail: "Tracks what percentage of a market's all-time volume occurred in the last 24 hours. A high ratio means the market went from dormant to active very quickly — a common pattern when insiders begin positioning before news breaks.",
  },
  baseline: {
    title: "Baseline Deviation",
    detail: "Compares current activity against the market's own historical norms. Uses weekly and monthly volume data to detect when a market breaks from its established pattern. Flags young markets with sudden surges as higher risk.",
  },
  timeDecay: {
    title: "Time Decay",
    detail: "Analyzes how recent the trading activity is within the data window. Flags markets where a disproportionate share of volume happened in the most recent hours — the signature of fast-moving informed trading.",
  },
  convergence: {
    title: "Convergence",
    detail: "Bonus signal that fires when multiple other flags trigger simultaneously. Markets where volume, baseline, and time-decay all spike together are far more suspicious than single-signal anomalies.",
  },
  spread: {
    title: "Bid-Ask Spread",
    detail: "Detects unusually wide spreads between buy and sell prices, indicating thin liquidity. Controlled internally but not exposed as a slider.",
  },
};

function CompactSlider({
  category,
  value,
  onChange,
}: {
  category: ScoringCategory;
  value: number;
  onChange: (val: number) => void;
}) {
  const { label } = WEIGHT_LABELS[category];
  const isDefault = Math.abs(value - 1.0) < 0.05;
  const isZero = value < 0.05;

  return (
    <div className="flex items-center gap-2.5 lg:gap-4 min-w-0">
      <span className="font-mono-data text-xs lg:text-base text-muted-foreground w-[80px] lg:w-[130px] flex-shrink-0 truncate">{label}</span>
      <input
        data-testid={`slider-weight-${category}`}
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Math.round(parseFloat(e.target.value) * 10) / 10)}
        onInput={(e) => onChange(Math.round(parseFloat((e.target as HTMLInputElement).value) * 10) / 10)}
        className="flex-1 h-7 lg:h-9 appearance-none bg-transparent cursor-pointer min-w-0 touch-none
          [&::-webkit-slider-runnable-track]:h-1.5 lg:[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
          [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-[hsl(var(--dw-orange))]
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
          [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_hsl(var(--dw-orange)/0.3)]
          [&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-muted [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0
          [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-sm
          [&::-moz-range-thumb]:bg-[hsl(var(--dw-orange))] [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-background
          [&::-moz-range-thumb]:shadow-[0_0_0_1px_hsl(var(--dw-orange)/0.3)]
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <span
        data-testid={`text-weight-${category}`}
        className={`font-mono-data text-xs lg:text-base font-bold tabular-nums w-[32px] lg:w-[48px] text-right flex-shrink-0 ${
          isZero ? "text-muted-foreground" : isDefault ? "text-foreground" : "text-[hsl(var(--dw-orange))]"
        }`}
      >
        {value.toFixed(1)}x
      </span>
    </div>
  );
}

export function ScoringToggle({ isOpen, isModified, onToggle }: ScoringToggleProps) {
  const Chevron = isOpen ? ChevronUp : ChevronDown;

  return (
    <button
      data-testid="button-adjust-weights"
      onClick={onToggle}
      className={`flex items-center gap-1.5 lg:gap-2 font-mono-data text-xs lg:text-base uppercase tracking-wider transition-colors px-4 lg:px-5 py-2 lg:py-3 rounded border ${
        isModified
          ? "text-[hsl(var(--dw-orange))] border-[hsl(var(--dw-orange))]/30 lg:border-[hsl(var(--dw-orange))] bg-[hsl(var(--dw-orange))]/5 lg:bg-[hsl(var(--dw-orange))]/25"
          : "text-muted-foreground hover:text-foreground border-border hover:border-foreground/20 lg:hover:border-foreground"
      }`}
    >
      Adjust weights
      {isModified && <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[hsl(var(--dw-orange))]" />}
      <Chevron className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
    </button>
  );
}

export function ScoringPanelBody({ weights, onChange }: ScoringPanelBodyProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const isModified = SCORING_CATEGORIES.some(
    (k) => Math.abs(weights[k] - DEFAULT_WEIGHTS[k]) > 0.05
  );

  return (
    <div
      data-testid="panel-scoring-weights"
      className="bg-card/80 lg:bg-card border border-border rounded px-3 lg:px-5 py-2 lg:py-4 space-y-1.5 lg:space-y-3"
    >
      <div className="flex items-center justify-between mb-0.5 lg:mb-1">
        <div className="flex items-center gap-1.5 lg:gap-2">
          <span className="font-mono-data text-[9px] lg:text-xs uppercase tracking-widest text-muted-foreground">
            Weights
          </span>
          <button
            data-testid="button-weights-help"
            onClick={() => setHelpOpen(!helpOpen)}
            className={`transition-colors ${helpOpen ? "text-[hsl(var(--dw-blue))]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <HelpCircle className="w-3 h-3 lg:w-4 lg:h-4" />
          </button>
        </div>
        <button
          data-testid="button-reset-weights"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          disabled={!isModified}
          className="flex items-center gap-1 lg:gap-1.5 text-[9px] lg:text-xs font-mono-data text-muted-foreground hover:text-foreground disabled:opacity-30 lg:disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-2 h-2 lg:w-3.5 lg:h-3.5" />
          Reset
        </button>
      </div>

      {helpOpen && (
        <div data-testid="panel-weights-help" className="border border-[hsl(var(--dw-blue))]/20 lg:border-[hsl(var(--dw-blue))] bg-[hsl(var(--dw-blue))]/[0.03] lg:bg-[hsl(var(--dw-blue))]/20 rounded p-2.5 lg:p-4 space-y-2 lg:space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono-data text-[9px] lg:text-xs uppercase tracking-widest text-[hsl(var(--dw-blue))]">Signal Guide</span>
            <button onClick={() => setHelpOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
          {SCORING_CATEGORIES.map(cat => (
            <div key={cat}>
              <div className="font-mono-data text-[10px] lg:text-sm font-bold text-foreground/90 lg:text-foreground mb-0.5">{HELP_INFO[cat].title}</div>
              <div className="font-mono-data text-[10px] lg:text-sm text-muted-foreground leading-relaxed">{HELP_INFO[cat].detail}</div>
            </div>
          ))}
          <div className="font-mono-data text-[9px] lg:text-xs text-muted-foreground/60 lg:text-muted-foreground pt-1 border-t border-border/50 lg:border-border">
            0x = disabled · 1x = default · 2x = double weight
          </div>
        </div>
      )}

      {SCORING_CATEGORIES.map((cat) => (
        <CompactSlider
          key={cat}
          category={cat}
          value={weights[cat]}
          onChange={(val) => onChange({ ...weights, [cat]: val })}
        />
      ))}
    </div>
  );
}
