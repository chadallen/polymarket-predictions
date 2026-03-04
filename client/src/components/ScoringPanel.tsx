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

const SCORING_CATEGORIES: ScoringCategory[] = ["volumeSpike", "concentration", "convergence"];

const HELP_INFO: Record<ScoringCategory, { title: string; detail: string }> = {
  volumeSpike: {
    title: "Volume Spike",
    detail: "Measures how unusual today's trading volume is compared to the 30-day average. Also factors in absolute dollar volume and weekly price momentum. High values flag sudden surges in interest that may indicate informed trading ahead of an event.",
  },
  concentration: {
    title: "Concentration",
    detail: "Tracks what percentage of a market's all-time volume occurred in the last 24 hours. A high ratio means the market went from dormant to active very quickly — a common pattern when insiders begin positioning before news breaks.",
  },
  convergence: {
    title: "Convergence",
    detail: "Bonus signal that fires when multiple other flags trigger simultaneously. Markets where volume, concentration, and spread all spike together are far more suspicious than single-signal anomalies. Higher weight amplifies this compounding effect.",
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
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="font-mono-data text-xs text-muted-foreground w-[80px] flex-shrink-0 truncate">{label}</span>
      <input
        data-testid={`slider-weight-${category}`}
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Math.round(parseFloat(e.target.value) * 10) / 10)}
        onInput={(e) => onChange(Math.round(parseFloat((e.target as HTMLInputElement).value) * 10) / 10)}
        className="flex-1 h-7 appearance-none bg-transparent cursor-pointer min-w-0 touch-none
          [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-runnable-track]:rounded-full
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
        className={`font-mono-data text-xs font-bold tabular-nums w-[32px] text-right flex-shrink-0 ${
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
      className={`flex items-center gap-1.5 font-mono-data text-xs uppercase tracking-wider transition-colors px-4 py-2 rounded border ${
        isModified
          ? "text-[hsl(var(--dw-orange))] border-[hsl(var(--dw-orange))]/30 bg-[hsl(var(--dw-orange))]/5"
          : "text-muted-foreground hover:text-foreground border-border hover:border-foreground/20"
      }`}
    >
      Adjust weights
      {isModified && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--dw-orange))]" />}
      <Chevron className="w-3.5 h-3.5" />
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
      className="bg-card/80 border border-border rounded px-3 py-2 space-y-1.5"
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground">
            Weights
          </span>
          <button
            data-testid="button-weights-help"
            onClick={() => setHelpOpen(!helpOpen)}
            className={`transition-colors ${helpOpen ? "text-[hsl(var(--dw-blue))]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>
        <button
          data-testid="button-reset-weights"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          disabled={!isModified}
          className="flex items-center gap-1 text-[9px] font-mono-data text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-2 h-2" />
          Reset
        </button>
      </div>

      {helpOpen && (
        <div data-testid="panel-weights-help" className="border border-[hsl(var(--dw-blue))]/20 bg-[hsl(var(--dw-blue))]/[0.03] rounded p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono-data text-[9px] uppercase tracking-widest text-[hsl(var(--dw-blue))]">Signal Guide</span>
            <button onClick={() => setHelpOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {SCORING_CATEGORIES.map(cat => (
            <div key={cat}>
              <div className="font-mono-data text-[10px] font-bold text-foreground/90 mb-0.5">{HELP_INFO[cat].title}</div>
              <div className="font-mono-data text-[10px] text-muted-foreground leading-relaxed">{HELP_INFO[cat].detail}</div>
            </div>
          ))}
          <div className="font-mono-data text-[9px] text-muted-foreground/60 pt-1 border-t border-border/50">
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
