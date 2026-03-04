import { motion } from "framer-motion";
import { getScoreColor } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 120 }: ScoreGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const colorClass = getScoreColor(score);
  // Extract just the hex/hsl mapping for stroke if possible, but using currentColor with utility classes is easiest.

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated score ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={colorClass}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-4xl font-mono-data font-bold ${colorClass}`}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono-data">
          Risk
        </span>
      </div>
    </div>
  );
}
