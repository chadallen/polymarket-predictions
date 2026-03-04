import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCents(value: number) {
  return `${(value * 100).toFixed(1)}¢`;
}

export function getScoreColor(score: number) {
  if (score >= 70) return "text-[hsl(var(--dw-red))]";
  if (score >= 62) return "text-[hsl(var(--dw-orange))]";
  if (score >= 30) return "text-[hsl(var(--dw-yellow))]";
  return "text-[hsl(var(--dw-green))]";
}

export function getScoreBg(score: number) {
  if (score >= 70) return "bg-[hsl(var(--dw-red))]/10 border-[hsl(var(--dw-red))]/30";
  if (score >= 62) return "bg-[hsl(var(--dw-orange))]/10 border-[hsl(var(--dw-orange))]/30";
  if (score >= 30) return "bg-[hsl(var(--dw-yellow))]/10 border-[hsl(var(--dw-yellow))]/30";
  return "bg-[hsl(var(--dw-green))]/10 border-[hsl(var(--dw-green))]/30";
}

