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
      "presidential", "governor", "mayor", "legislation", "lawmakers?",
      "republicans?", "democrats?", "trump", "biden", "putin", "zelensky",
      "nato", "wars?", "military", "ceasefire", "conflicts?", "sanctions?",
      "geopolitic(?:s|al)", "immigration", "border\\s?wall",
      "iran(?:ian)?", "russia(?:n)?", "ukraine", "china", "taiwan",
      "israel(?:i)?", "gaza", "hamas", "hezbollah",
    ],
  },
  {
    id: "sports",
    label: "Sports",
    color: "var(--dw-green)",
    glow: "text-glow-green",
    keywords: [
      "nba", "nfl", "mlb", "nhl", "mls", "ufc", "fifa", "premier league",
      "champions league", "world cup", "super bowl", "playoffs?",
      "championship", "mvp", "touchdown", "goals?", "assists?",
      "quarterback", "pitcher", "striker", "boxing", "tennis",
      "f1", "formula[\\s-]?1", "nascar", "olympics?",
      "basketball", "football", "baseball", "soccer", "hockey",
      "cricket", "rugby", "golf", "pga",
      "lakers?", "celtics?", "warriors?", "chiefs?", "eagles?",
      "yankees?", "dodgers?", "coach", "draft",
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    color: "var(--dw-orange)",
    glow: "text-glow-orange",
    keywords: [
      "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
      "crypto(?:currency)?", "blockchain", "defi", "nft",
      "altcoins?", "tokens?", "web3", "mining", "staking",
      "binance", "coinbase", "wallet", "doge(?:coin)?",
      "xrp", "ripple", "cardano", "polygon", "avalanche",
      "memecoin", "airdrop", "halving", "bitcoin\\s?etf",
    ],
  },
  {
    id: "tech",
    label: "Tech",
    color: "var(--dw-red)",
    glow: "text-glow-red",
    keywords: [
      "ai\\b", "artificial intelligence", "openai", "chatgpt", "gpt",
      "google", "apple", "microsoft", "meta", "amazon", "nvidia",
      "tesla", "spacex", "starship", "rocket", "launch",
      "cyber\\w*", "hack(?:s|ing)?", "tech(?:nology)?",
      "software", "hardware", "chips?", "semiconductor",
      "robot(?:s|ics)?", "autonomous", "self[\\s-]?driving",
      "iphone", "android", "app\\b", "startup",
      "tiktok", "twitter", "x\\.com", "social media",
    ],
  },
  {
    id: "culture",
    label: "Culture",
    color: "var(--dw-yellow)",
    glow: "text-glow-yellow",
    keywords: [
      "oscar", "grammy", "emmy", "tony\\s?award", "academy\\s?award",
      "movie", "film", "netflix", "disney", "streaming",
      "music", "album", "concert", "tour", "billboard",
      "celebrity", "influencer", "viral", "trending",
      "tv\\s?show", "series", "reality\\s?tv", "bachelor",
      "fashion", "met\\s?gala", "brand", "luxury",
      "kanye", "taylor\\s?swift", "drake", "beyonce",
      "wedding", "divorce", "scandal", "controversy",
      "royal(?:s|ty)?", "pope", "religion",
    ],
  },
  {
    id: "economy",
    label: "Economy",
    color: "220 15% 60%",
    glow: "",
    keywords: [
      "stock(?:s|market)?", "s&p", "nasdaq", "dow\\s?jones",
      "fed(?:eral reserve)?", "interest\\s?rates?", "inflation",
      "recession", "gdp", "unemployment", "jobs?\\s?report",
      "earnings?", "revenue", "ipo", "market\\s?cap",
      "tariffs?", "trade\\s?war", "opec", "oil\\s?price",
      "real\\s?estate", "housing", "mortgage",
      "dollar", "euro", "yen", "currency",
      "debt\\s?ceiling", "stimulus", "bailout",
      "wall\\s?street", "hedge\\s?fund", "invest(?:ment|ing|or)?",
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
