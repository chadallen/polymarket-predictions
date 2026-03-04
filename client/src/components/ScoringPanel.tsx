import { RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
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
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono-data text-[10px] text-muted-foreground w-[72px] flex-shrink-0 truncate">{label}</span>
      <input
        data-testid={`slider-weight-${category}`}
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Math.round(parseFloat(e.target.value) * 10) / 10)}
        onInput={(e) => onChange(Math.round(parseFloat((e.target as HTMLInputElement).value) * 10) / 10)}
        className="flex-1 h-1 appearance-none bg-muted rounded-full cursor-pointer min-w-0
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--dw-orange))]
          [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[hsl(var(--dw-orange))] [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
      <span
        data-testid={`text-weight-${category}`}
        className={`font-mono-data text-[10px] font-bold tabular-nums w-[28px] text-right flex-shrink-0 ${
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
      className={`flex items-center gap-1.5 font-mono-data text-[10px] uppercase tracking-wider transition-colors ${
        isModified
          ? "text-[hsl(var(--dw-orange))]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Adjust weights
      {isModified && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--dw-orange))]" />}
      <Chevron className="w-3 h-3" />
    </button>
  );
}

export function ScoringPanelBody({ weights, onChange }: ScoringPanelBodyProps) {
  const isModified = SCORING_CATEGORIES.some(
    (k) => Math.abs(weights[k] - DEFAULT_WEIGHTS[k]) > 0.05
  );

  return (
    <div
      data-testid="panel-scoring-weights"
      className="bg-card/80 border border-border rounded px-3 py-2 space-y-1.5"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono-data text-[9px] uppercase tracking-widest text-muted-foreground">
          Weights
        </span>
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
