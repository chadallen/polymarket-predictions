export interface Category {
  id: string;
  label: string;
  color: string;
  glow: string;
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "politics",
    label: "Politics",
    color: "var(--dw-blue)",
    glow: "text-glow-blue",
    keywords: [
      "elections?", "presidents?", "votes?", "ballots?", "parliaments?", "congress",
      "senates?", "cabinets?", "ministers?", "ambassadors?", "democratic", "regimes?",
      "dictators?", "authoritarian", "summits?", "diplomacy", "treat(?:y|ies)",
      "presidential",
    ],
  },
  {
    id: "military",
    label: "Military",
    color: "var(--dw-red)",
    glow: "text-glow-red",
    keywords: [
      "wars?", "military", "ceasefire", "troops?", "missiles?", "coups?",
      "invasions?", "conflicts?", "weapons?", "defen[sc]e", "army", "air[- ]?force",
      "navy", "submarines?", "airstrikes?", "bombings?", "drones?", "nuclear",
      "milit(?:ia|ias)", "mercenary", "mercenaries", "wagner", "rebels?", "insurgents?",
    ],
  },
  {
    id: "economics",
    label: "Economics",
    color: "var(--dw-yellow)",
    glow: "text-glow-yellow",
    keywords: [
      "sanctions?", "tariffs?", "opec", "oil", "embargoes?", "embargo",
      "blockades?", "trade",
    ],
  },
  {
    id: "cyber",
    label: "Cyber/Intel",
    color: "var(--dw-green)",
    glow: "text-glow-green",
    keywords: [
      "cyber\\w*", "hacks?", "hacking", "espionage", "intelligence",
      "pentagon", "kremlin", "chemical", "biological",
    ],
  },
  {
    id: "regional",
    label: "Regional",
    color: "var(--dw-orange)",
    glow: "text-glow-orange",
    keywords: [
      "iran(?:ian)?", "russia(?:n)?", "ukraine", "ukrain(?:ian)?", "china",
      "chinese", "taiwan(?:ese)?", "north korea(?:n)?", "israel(?:i)?",
      "gaza", "nato", "hezbollah", "hamas", "houthi", "cartels?",
      "putin", "zelensky", "biden", "trump",
      "borders?", "territor(?:y|ies|ial)", "annexations?", "occupations?",
      "sovereign(?:ty)?", "separatists?", "secessions?",
      "refugees?", "humanitarian", "genocide", "ethnic",
      "hostages?", "terrorism", "terrorists?",
    ],
  },
];

const categoryPatterns = CATEGORIES.map(cat => ({
  id: cat.id,
  pattern: new RegExp(`\\b(?:${cat.keywords.join("|")})\\b`, "i"),
}));

export function classifyMarket(question: string): string[] {
  const matched: string[] = [];

  for (const { id, pattern } of categoryPatterns) {
    if (pattern.test(question)) {
      matched.push(id);
    }
  }

  return matched.length > 0 ? matched : ["other"];
}
