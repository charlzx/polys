import { useQuery } from "@tanstack/react-query";

const MARKETS_API = "/api/markets";
const PRICE_HISTORY_API = "/api/price-history";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransformedMarket {
  id: string;
  name: string;
  description: string;
  category: string;
  yesOdds: number;
  noOdds: number;
  change24h: number;
  volume: string;
  volume24h: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  image?: string;
  slug: string;
  conditionId?: string;
  yesTokenId?: string;
  noTokenId?: string;
}

interface GammaMarket {
  id: string;
  question?: string;
  description?: string;
  category?: string;
  tags?: Array<{ id: string; label: string }>;
  active?: boolean;
  closed?: boolean;
  endDate?: string;
  endDateIso?: string;
  image?: string;
  icon?: string;
  slug?: string;
  conditionId?: string;
  outcomePrices?: string;
  volume?: string | number;
  volume24hr?: string | number;
  liquidity?: string | number;
  liquidityNum?: number;
  volumeNum?: number;
  clobTokenIds?: string;
  outcomes?: string;
  lastTradePrice?: string | number;
  oneDayPriceChange?: string | number;
  events?: Array<{ title?: string; slug?: string; ticker?: string; category?: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDollar(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === "") return "$0";
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (isNaN(n) || n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
  crypto: "Crypto",
  bitcoin: "Crypto",
  ethereum: "Crypto",
  solana: "Crypto",
  defi: "Crypto",
  nft: "Crypto",
  politics: "Politics",
  election: "Politics",
  president: "Politics",
  congress: "Politics",
  senate: "Politics",
  democrat: "Politics",
  republican: "Politics",
  sport: "Sports",
  nba: "Sports",
  nfl: "Sports",
  mlb: "Sports",
  nhl: "Sports",
  soccer: "Sports",
  football: "Sports",
  basketball: "Sports",
  tennis: "Sports",
  "super bowl": "Sports",
  "world cup": "Sports",
  economy: "Economics",
  economics: "Economics",
  inflation: "Economics",
  recession: "Economics",
  gdp: "Economics",
  fed: "Economics",
  "interest rate": "Economics",
  "stock market": "Economics",
  nasdaq: "Economics",
  "s&p": "Economics",
  tech: "Tech",
  technology: "Tech",
  ai: "Tech",
  openai: "Tech",
  apple: "Tech",
  google: "Tech",
  microsoft: "Tech",
  nvidia: "Tech",
  spacex: "Tech",
  nasa: "Tech",
  entertainment: "Entertainment",
  movie: "Entertainment",
  oscar: "Entertainment",
  music: "Entertainment",
  grammy: "Entertainment",
  emmy: "Entertainment",
};

// Sports event ticker prefixes used by Polymarket (cbb=college basketball, nba, nfl, mlb, etc.)
const SPORTS_TICKER_PREFIXES = [
  "cbb-", "nba-", "nfl-", "mlb-", "nhl-", "cfb-", "mls-", "ucl-", "epl-",
  "fifa-", "wc-", "soccer-", "tennis-", "golf-", "f1-", "boxing-", "ufc-",
  "ncaa-", "ncaaf-", "ncaab-", "nfl-draft-", "super-bowl-",
];

function deriveCategory(market: GammaMarket): string {
  // First: check event tickers — these are the most reliable signal
  for (const event of market.events ?? []) {
    const ticker = (event.ticker ?? event.slug ?? "").toLowerCase();
    if (SPORTS_TICKER_PREFIXES.some((pfx) => ticker.startsWith(pfx))) {
      return "Sports";
    }
    if (event.category) {
      const ec = event.category.toLowerCase();
      for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
        if (ec.includes(kw)) return cat;
      }
    }
  }

  // Explicit category field
  if (market.category) {
    const cat = market.category.toLowerCase();
    for (const [kw, val] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cat.includes(kw)) return val;
    }
  }

  // Tags
  for (const tag of market.tags ?? []) {
    const label = tag.label.toLowerCase();
    for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (label.includes(kw)) return cat;
    }
  }

  // Finally: question text (least reliable, avoid short-word false positives)
  const question = (market.question ?? "").toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    // Only match if the keyword appears as a whole word
    const wordBoundary = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (wordBoundary.test(question)) return cat;
  }

  return "General";
}

function transformMarket(raw: GammaMarket): TransformedMarket {
  let yesOdds = 50;
  let noOdds = 50;

  try {
    const prices = JSON.parse(raw.outcomePrices || "[]");
    if (prices.length >= 2) {
      const yes = parseFloat(prices[0]);
      const no = parseFloat(prices[1]);
      if (!isNaN(yes) && !isNaN(no)) {
        yesOdds = Math.round(yes * 1000) / 10;
        noOdds = Math.round(no * 1000) / 10;
      }
    }
  } catch {
    // ignore parse errors
  }

  let yesTokenId: string | undefined;
  let noTokenId: string | undefined;

  try {
    const tokenIds = JSON.parse(raw.clobTokenIds || "[]");
    yesTokenId = tokenIds[0] ? String(tokenIds[0]) : undefined;
    noTokenId = tokenIds[1] ? String(tokenIds[1]) : undefined;
  } catch {
    // ignore parse errors
  }

  let change24h = 0;
  const rawChange = raw.oneDayPriceChange;
  if (rawChange !== undefined && rawChange !== null) {
    const parsed = parseFloat(String(rawChange));
    if (!isNaN(parsed)) {
      change24h = parseFloat((parsed * 100).toFixed(1));
    }
  }

  const endDate = raw.endDateIso || (raw.endDate ? raw.endDate.split("T")[0] : "");

  const volume = raw.volumeNum !== undefined ? raw.volumeNum : raw.volume;
  const volume24h = raw.volume24hr;
  const liquidity = raw.liquidityNum !== undefined ? raw.liquidityNum : raw.liquidity;

  return {
    id: raw.id,
    name: raw.question || "Unknown Market",
    description: raw.description || "",
    category: deriveCategory(raw),
    yesOdds,
    noOdds,
    change24h,
    volume: formatDollar(volume),
    volume24h: formatDollar(volume24h),
    liquidity: formatDollar(liquidity),
    endDate,
    active: raw.active !== false && !raw.closed,
    image: raw.image || raw.icon,
    slug: raw.slug || raw.id,
    conditionId: raw.conditionId,
    yesTokenId,
    noTokenId,
  };
}

// ─── API Fetchers ─────────────────────────────────────────────────────────────

export async function fetchMarkets(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
}): Promise<TransformedMarket[]> {
  const sp = new URLSearchParams();
  sp.set("limit", String(params?.limit ?? 50));
  sp.set("offset", String(params?.offset ?? 0));
  sp.set("order", "volume24hr");
  sp.set("ascending", "false");
  if (params?.active !== false) {
    sp.set("active", "true");
    sp.set("closed", "false");
  }

  const res = await fetch(`${MARKETS_API}?${sp.toString()}`);
  if (!res.ok) throw new Error(`Markets API error: ${res.status}`);
  const data: GammaMarket[] = await res.json();
  return data.map(transformMarket);
}

export async function fetchMarketById(id: string): Promise<TransformedMarket | null> {
  try {
    const res = await fetch(`${MARKETS_API}/${id}`);
    if (res.ok) {
      const data: GammaMarket = await res.json();
      if (data?.id) return transformMarket(data);
    }
  } catch {
    // fall through
  }

  // Fallback: query by conditionId
  if (id.startsWith("0x")) {
    try {
      const sp = new URLSearchParams({ conditionId: id });
      const res = await fetch(`${MARKETS_API}?${sp.toString()}`);
      if (res.ok) {
        const data: GammaMarket[] = await res.json();
        if (data.length > 0) return transformMarket(data[0]);
      }
    } catch {
      // fall through
    }
  }

  return null;
}

export async function searchMarkets(query: string): Promise<TransformedMarket[]> {
  if (!query.trim()) return [];

  const sp = new URLSearchParams({ q: query, limit: "20", active: "true" });
  try {
    const res = await fetch(`${MARKETS_API}?${sp.toString()}`);
    if (!res.ok) return [];
    const data: GammaMarket[] = await res.json();
    return data.map(transformMarket);
  } catch {
    return [];
  }
}

// Fetch real price history from the CLOB API (via server proxy)
export async function fetchPriceHistory(
  tokenId: string,
  timeframe: string = "30D"
): Promise<Array<{ date: string; yes: number; no: number }>> {
  const intervalMap: Record<string, { interval: string; fidelity: number }> = {
    "24H": { interval: "1d", fidelity: 60 },
    "7D":  { interval: "1w", fidelity: 60 },
    "30D": { interval: "1m", fidelity: 60 },
    "3M":  { interval: "3m", fidelity: 60 },
    "ALL": { interval: "max", fidelity: 100 },
  };

  const { interval, fidelity } = intervalMap[timeframe] ?? intervalMap["30D"];
  const sp = new URLSearchParams({
    market: tokenId,
    interval,
    fidelity: String(fidelity),
  });

  try {
    const res = await fetch(`${PRICE_HISTORY_API}?${sp.toString()}`);
    if (!res.ok) return [];

    const data = await res.json();
    const history: Array<{ t: number; p: number }> = data.history ?? [];
    if (history.length === 0) return [];

    return history.map((point) => {
      const yes = Math.round(point.p * 1000) / 10;
      const no = Math.round((1 - point.p) * 1000) / 10;
      return {
        date: new Date(point.t * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        yes,
        no,
      };
    });
  } catch {
    return [];
  }
}

// ─── React Query Hooks ────────────────────────────────────────────────────────

export function useMarkets(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
}) {
  return useQuery({
    queryKey: ["markets", params],
    queryFn: () => fetchMarkets(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => fetchMarketById(id),
    staleTime: 15_000,
    enabled: !!id,
    retry: 2,
  });
}

export function useMarketSearch(query: string) {
  return useQuery({
    queryKey: ["marketSearch", query],
    queryFn: () => searchMarkets(query),
    staleTime: 30_000,
    enabled: query.length >= 2,
    retry: 1,
  });
}

export function usePriceHistory(
  tokenId: string | undefined,
  timeframe: string = "30D"
) {
  return useQuery({
    queryKey: ["priceHistory", tokenId, timeframe],
    queryFn: () => fetchPriceHistory(tokenId!, timeframe),
    enabled: !!tokenId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// ─── Order Book ───────────────────────────────────────────────────────────────

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  maxTotal: number;
  timestamp: number;
}

async function fetchOrderbook(tokenId: string): Promise<OrderBook | null> {
  try {
    const res = await fetch(`/api/orderbook?token_id=${encodeURIComponent(tokenId)}`);
    if (!res.ok) return null;

    const data = await res.json();
    const rawBids: Array<{ price: string; size: string }> = data.bids ?? [];
    const rawAsks: Array<{ price: string; size: string }> = data.asks ?? [];

    // Sort and compute running totals
    const sortedBids = [...rawBids]
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 8);

    const sortedAsks = [...rawAsks]
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 8);

    let bidTotal = 0;
    const bids: OrderBookLevel[] = sortedBids.map((b) => {
      bidTotal += parseFloat(b.size);
      return { price: parseFloat(b.price), size: Math.round(parseFloat(b.size)), total: bidTotal };
    });

    let askTotal = 0;
    const asks: OrderBookLevel[] = sortedAsks.map((a) => {
      askTotal += parseFloat(a.size);
      return { price: parseFloat(a.price), size: Math.round(parseFloat(a.size)), total: askTotal };
    });

    return {
      bids,
      asks: asks.reverse(),
      maxTotal: Math.max(bidTotal, askTotal),
      timestamp: data.timestamp ? parseInt(data.timestamp) : Date.now(),
    };
  } catch {
    return null;
  }
}

export function useOrderbook(tokenId: string | undefined) {
  return useQuery({
    queryKey: ["orderbook", tokenId],
    queryFn: () => fetchOrderbook(tokenId!),
    enabled: !!tokenId,
    staleTime: 5_000,
    refetchInterval: 10_000,
    retry: 1,
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const MARKET_CATEGORIES = [
  "All",
  "Politics",
  "Crypto",
  "Sports",
  "Economics",
  "Tech",
  "Entertainment",
  "General",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];
