import { useQuery } from "@tanstack/react-query";

const GAMMA_API = "https://gamma-api.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";

export interface WhaleMarket {
  id: string;
  slug: string;
  name: string;
  category: string;
  volume24h: number;
  totalVolume: number;
  yesPrice: number;
  noPrice: number;
  priceChange24h: number;
  liquidity: number;
  image?: string;
  endDate?: string;
  lastActivity: Date;
}

export interface WhalePosition {
  conditionId: string;
  market: string;
  question: string;
  outcome: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  endDate?: string;
  image?: string;
}

export interface WhaleActivity {
  id: string;
  proxyWallet: string;
  type: string;
  condition_id?: string;
  title: string;
  side: string;
  amount: number;
  price: number;
  outcome: string;
  timestamp: Date;
}

export interface WhaleProfile {
  address: string;
  portfolioValue: number;
  positions: WhalePosition[];
  activity: WhaleActivity[];
}

export interface WhaleSummary {
  markets: WhaleMarket[];
  totalVolume24h: number;
  totalLiquidity: number;
  largestMove: { market: string; change: number } | null;
}

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

function formatCategory(raw: string | undefined): string {
  if (!raw) return "General";
  const c = raw.toLowerCase();
  if (c.includes("crypto") || c.includes("bitcoin") || c.includes("eth")) return "Crypto";
  if (c.includes("politi") || c.includes("election")) return "Politics";
  if (c.includes("sport") || c.includes("nba") || c.includes("nfl")) return "Sports";
  if (c.includes("econ") || c.includes("fed") || c.includes("market")) return "Economics";
  if (c.includes("tech") || c.includes("ai")) return "Tech";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Fetch top markets by volume — used as whale activity indicators
export async function fetchWhaleMarkets(limit = 20): Promise<WhaleMarket[]> {
  const url = `${GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  const data = await res.json();
  const markets: GammaRawMarket[] = Array.isArray(data) ? data : [];

  return markets
    .filter((m) => safeNum(m.volume24hr) > 0 || safeNum(m.volume) > 0)
    .map((m) => {
      let yesPrice = 0;
      let noPrice = 0;
      try {
        const prices = JSON.parse(m.outcomePrices ?? "[]");
        yesPrice = Math.round(safeNum(prices[0]) * 100);
        noPrice = Math.round(safeNum(prices[1]) * 100);
      } catch {
        yesPrice = Math.round(safeNum(m.lastTradePrice) * 100);
        noPrice = 100 - yesPrice;
      }

      return {
        id: String(m.id),
        slug: m.slug ?? String(m.id),
        name: m.question ?? "",
        category: formatCategory(m.category),
        volume24h: safeNum(m.volume24hr),
        totalVolume: safeNum(m.volumeNum ?? m.volume),
        yesPrice,
        noPrice,
        priceChange24h: Math.round(safeNum(m.oneDayPriceChange) * 100 * 10) / 10,
        liquidity: safeNum(m.liquidityNum ?? m.liquidity),
        image: m.image ?? m.icon,
        endDate: m.endDateIso ?? m.endDate,
        lastActivity: new Date(),
      };
    });
}

// Fetch individual whale profile (positions + activity + portfolio value)
export async function fetchWhaleProfile(address: string): Promise<WhaleProfile> {
  const [posRes, actRes, valRes] = await Promise.allSettled([
    fetch(`${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=50`, {
      next: { revalidate: 30 },
    }),
    fetch(`${DATA_API}/activity?user=${address}&limit=50`, {
      next: { revalidate: 30 },
    }),
    fetch(`${DATA_API}/value?user=${address}`, {
      next: { revalidate: 30 },
    }),
  ]);

  let positions: WhalePosition[] = [];
  let activity: WhaleActivity[] = [];
  let portfolioValue = 0;

  if (posRes.status === "fulfilled" && posRes.value.ok) {
    const raw = await posRes.value.json();
    positions = (Array.isArray(raw) ? raw : []).map((p: RawPosition) => ({
      conditionId: p.conditionId ?? p.market ?? "",
      market: p.market ?? "",
      question: p.title ?? p.question ?? "",
      outcome: p.outcome ?? "YES",
      outcomeIndex: p.outcomeIndex ?? 0,
      size: safeNum(p.size),
      avgPrice: safeNum(p.avgPrice),
      initialValue: safeNum(p.initialValue),
      currentValue: safeNum(p.currentValue),
      cashPnl: safeNum(p.cashPnl),
      percentPnl: safeNum(p.percentPnl),
      endDate: p.endDate,
      image: p.image ?? p.icon,
    }));
  }

  if (actRes.status === "fulfilled" && actRes.value.ok) {
    const raw = await actRes.value.json();
    activity = (Array.isArray(raw) ? raw : []).map((a: RawActivity) => ({
      id: a.id ?? `${a.timestamp}-${Math.random()}`,
      proxyWallet: address,
      type: a.type ?? "TRADE",
      condition_id: a.conditionId,
      title: a.title ?? a.question ?? "",
      side: a.side ?? (safeNum(a.amount) > 0 ? "BUY" : "SELL"),
      amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
      price: safeNum(a.price),
      outcome: a.outcome ?? "YES",
      timestamp: new Date(a.timestamp ?? Date.now()),
    }));
  }

  if (valRes.status === "fulfilled" && valRes.value.ok) {
    const raw = await valRes.value.json();
    const arr = Array.isArray(raw) ? raw : [];
    portfolioValue = safeNum(arr[0]?.value ?? 0);
  }

  return { address, portfolioValue, positions, activity };
}

// Gamma raw market shape (minimal fields we use)
interface GammaRawMarket {
  id: string | number;
  question?: string;
  slug?: string;
  category?: string;
  volume24hr?: string | number;
  volume?: string | number;
  volumeNum?: number;
  liquidityNum?: number;
  liquidity?: string | number;
  outcomePrices?: string;
  lastTradePrice?: string | number;
  oneDayPriceChange?: string | number;
  endDateIso?: string;
  endDate?: string;
  image?: string;
  icon?: string;
}

// data-api raw shapes
interface RawPosition {
  conditionId?: string;
  market?: string;
  title?: string;
  question?: string;
  outcome?: string;
  outcomeIndex?: number;
  size?: string | number;
  avgPrice?: string | number;
  initialValue?: string | number;
  currentValue?: string | number;
  cashPnl?: string | number;
  percentPnl?: string | number;
  endDate?: string;
  image?: string;
  icon?: string;
}

interface RawActivity {
  id?: string;
  type?: string;
  conditionId?: string;
  title?: string;
  question?: string;
  side?: string;
  amount?: string | number;
  usdcSize?: string | number;
  price?: string | number;
  outcome?: string;
  timestamp?: string | number;
}

// React Query hooks
export function useWhaleMarkets(limit = 20) {
  return useQuery<WhaleMarket[]>({
    queryKey: ["whale-markets", limit],
    queryFn: () => fetchWhaleMarkets(limit),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useWhaleProfile(address: string | null) {
  return useQuery<WhaleProfile>({
    queryKey: ["whale-profile", address],
    queryFn: () => fetchWhaleProfile(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// Format helpers for display
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
