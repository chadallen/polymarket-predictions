import { motion } from "framer-motion";
import { getScoreColor } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  lgSize?: number;
}

export function ScoreGauge({ score, size = 80, lgSize }: ScoreGaugeProps) {
  const displaySize = lgSize || size;
  const strokeWidth = size < 100 ? 5 : 8;
  const lgStrokeWidth = displaySize < 100 ? 5 : 8;
  const radius = (size - strokeWidth) / 2;
  const lgRadius = (displaySize - lgStrokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const lgCircumference = lgRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const lgOffset = lgCircumference - (score / 100) * lgCircumference;
  const colorClass = getScoreColor(score);

  if (!lgSize) {
    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
          <motion.circle cx={size / 2} cy={size / 2} r={radius} className={colorClass} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ strokeDasharray: circumference }} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-xl font-mono-data font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex items-center justify-center shrink-0 lg:hidden" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
          <motion.circle cx={size / 2} cy={size / 2} r={radius} className={colorClass} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ strokeDasharray: circumference }} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-xl font-mono-data font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
      <div className="relative items-center justify-center shrink-0 hidden lg:flex" style={{ width: displaySize, height: displaySize }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle cx={displaySize / 2} cy={displaySize / 2} r={lgRadius} stroke="hsl(var(--muted))" strokeWidth={lgStrokeWidth} fill="none" />
          <motion.circle cx={displaySize / 2} cy={displaySize / 2} r={lgRadius} className={colorClass} stroke="currentColor" strokeWidth={lgStrokeWidth} strokeLinecap="round" fill="none" initial={{ strokeDashoffset: lgCircumference }} animate={{ strokeDashoffset: lgOffset }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ strokeDasharray: lgCircumference }} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-2xl font-mono-data font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
    </>
  );
}
