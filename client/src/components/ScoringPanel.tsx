import { Settings, RotateCcw } from "lucide-react";
import { type ScoringWeights, type ScoringCategory, DEFAULT_WEIGHTS, WEIGHT_LABELS } from "@/lib/scoring";

interface ScoringButtonProps {
  isOpen: boolean;
  isModified: boolean;
  onToggle: () => void;
}

interface ScoringPanelBodyProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

const SCORING_CATEGORIES: ScoringCategory[] = ["volumeSpike", "concentration", "spread", "convergence"];

function WeightSlider({
  category,
  value,
  onChange,
}: {
  category: ScoringCategory;
  value: number;
  onChange: (val: number) => void;
}) {
  const { label, description } = WEIGHT_LABELS[category];
  const isDefault = Math.abs(value - 1.0) < 0.05;
  const isZero = value < 0.05;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-data text-xs text-foreground">{label}</span>
          <span className="font-mono-data text-[9px] text-muted-foreground ml-2 hidden sm:inline">{description}</span>
        </div>
        <span
          data-testid={`text-weight-${category}`}
          className={`font-mono-data text-xs font-bold tabular-nums min-w-[2.5rem] text-right ${
            isZero ? "text-muted-foreground" : isDefault ? "text-foreground" : "text-[hsl(var(--dw-orange))]"
          }`}
        >
          {value.toFixed(1)}x
        </span>
      </div>
      <div className="relative">
        <input
          data-testid={`slider-weight-${category}`}
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={value}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value) * 10) / 10)}
          onInput={(e) => onChange(Math.round(parseFloat((e.target as HTMLInputElement).value) * 10) / 10)}
          className="w-full h-1.5 appearance-none bg-muted rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--dw-orange))]
            [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[hsl(var(--dw-orange))] [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] font-mono-data text-muted-foreground/50">OFF</span>
          <span className="text-[8px] font-mono-data text-muted-foreground/50">1x</span>
          <span className="text-[8px] font-mono-data text-muted-foreground/50">2x</span>
        </div>
      </div>
    </div>
  );
}

export function ScoringButton({ isOpen, isModified, onToggle }: ScoringButtonProps) {
  return (
    <button
      data-testid="button-scoring-settings"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded border text-xs font-mono-data transition-colors ${
        isOpen
          ? "border-[hsl(var(--dw-orange))]/40 text-[hsl(var(--dw-orange))] bg-[hsl(var(--dw-orange))]/5"
          : isModified
          ? "border-[hsl(var(--dw-orange))]/30 text-[hsl(var(--dw-orange))]"
          : "border-border text-muted-foreground hover:text-foreground hover:border-[hsl(var(--dw-orange))]/30"
      }`}
    >
      <Settings className="w-3.5 h-3.5" />
      {isModified && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--dw-orange))]" />}
    </button>
  );
}

export function ScoringPanelBody({ weights, onChange }: ScoringPanelBodyProps) {
  const isModified = Object.keys(DEFAULT_WEIGHTS).some(
    (k) => Math.abs(weights[k as ScoringCategory] - DEFAULT_WEIGHTS[k as ScoringCategory]) > 0.05
  );

  return (
    <div
      data-testid="panel-scoring-weights"
      className="bg-card border border-border rounded p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">
          Scoring Weights
        </span>
        <button
          data-testid="button-reset-weights"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          disabled={!isModified}
          className="flex items-center gap-1 text-[10px] font-mono-data text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset
        </button>
      </div>

      {SCORING_CATEGORIES.map((cat) => (
        <WeightSlider
          key={cat}
          category={cat}
          value={weights[cat]}
          onChange={(val) => onChange({ ...weights, [cat]: val })}
        />
      ))}
    </div>
  );
}
