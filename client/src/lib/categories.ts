export interface Category {
  id: string;
  label: string;
  color: string;
  glow: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "politics",
    label: "Politics",
    color: "var(--dw-blue)",
    glow: "text-glow-blue",
  },
  {
    id: "sports",
    label: "Sports",
    color: "var(--dw-green)",
    glow: "text-glow-green",
  },
  {
    id: "crypto",
    label: "Crypto",
    color: "var(--dw-orange)",
    glow: "text-glow-orange",
  },
  {
    id: "tech",
    label: "Tech",
    color: "var(--dw-red)",
    glow: "text-glow-red",
  },
  {
    id: "culture",
    label: "Culture",
    color: "var(--dw-yellow)",
    glow: "text-glow-yellow",
  },
  {
    id: "economy",
    label: "Economy",
    color: "220 15% 60%",
    glow: "",
  },
];
