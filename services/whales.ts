import { useQuery } from "@tanstack/react-query";

export const DATA_API = "https://data-api.polymarket.com";

// Polymarket-associated wallet addresses sourced from on-chain market maker data.
// Retrieved from gamma-api.polymarket.com market maker addresses.
// The feature gracefully handles wallets with no on-chain position data.
export const TRACKED_WHALES = [
  "0x8BD6C3D7a57D650A1870dd338234f90051fe9918",
  "0x3d3dB3BeE80414717e3C66c341EF95eCc9BDDBaB",
  "0x01a4333b6aCb5091cF0219646f35E289546F4656",
  "0x13064324dFF1e76062975345d255EFccc6C78bd0",
  "0x4d96190E8D0487d019987Cd9dF34dD51f617037F",
  "0xe7C33D231C3cc668457dE4F15AD398E2B8ECa8D7",
  "0x365E12B47919b0E3BCF1c8CC3Ecd8FB88b80560F",
  "0xD4D7c117645A85bCbe39Bfe9d8847628F75734b0",
  "0xEb70cbb241d2947aa2c145B9F8F9dd97309e54B7",
  "0x5a91461432cC131871beBb7adacE6523b95fEB51",
];

export interface WhaleEntry {
  address: string;
  portfolioValue: number;
  totalVolume: number;
  winRate: number;
  openPositions: number;
  recentTrades: number;
  lastActive: string | null;
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
  endDate?: string | null;
  image?: string | null;
}

export interface WhaleActivityItem {
  id: string;
  proxyWallet: string;
  type: string;
  conditionId?: string;
  title: string;
  side: string;
  amount: number;
  price: number;
  outcome: string;
  timestamp: string;
}

export interface WhaleProfile {
  address: string;
  portfolioValue: number;
  positions: WhalePosition[];
  activity: WhaleActivityItem[];
}

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
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

// Fetch profile data from data-api for a single wallet
export async function fetchWhaleProfile(address: string): Promise<WhaleProfile> {
  const [posRes, actRes, valRes] = await Promise.allSettled([
    fetch(`${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=50`),
    fetch(`${DATA_API}/activity?user=${address}&limit=50`),
    fetch(`${DATA_API}/value?user=${address}`),
  ]);

  let positions: WhalePosition[] = [];
  let activity: WhaleActivityItem[] = [];
  let portfolioValue = 0;

  if (posRes.status === "fulfilled" && posRes.value.ok) {
    const raw = await posRes.value.json();
    positions = (Array.isArray(raw) ? raw : []).map((p: Record<string, unknown>) => ({
      conditionId: String(p.conditionId ?? p.market ?? ""),
      market: String(p.market ?? ""),
      question: String(p.title ?? p.question ?? ""),
      outcome: String(p.outcome ?? "YES"),
      outcomeIndex: Number(p.outcomeIndex ?? 0),
      size: safeNum(p.size),
      avgPrice: safeNum(p.avgPrice),
      initialValue: safeNum(p.initialValue),
      currentValue: safeNum(p.currentValue),
      cashPnl: safeNum(p.cashPnl),
      percentPnl: safeNum(p.percentPnl),
      endDate: p.endDate ? String(p.endDate) : null,
      image: p.image ? String(p.image) : p.icon ? String(p.icon) : null,
    }));
  }

  if (actRes.status === "fulfilled" && actRes.value.ok) {
    const raw = await actRes.value.json();
    activity = (Array.isArray(raw) ? raw : []).map((a: Record<string, unknown>) => ({
      id: String(a.id ?? `${Date.now()}-${Math.random()}`),
      proxyWallet: address,
      type: String(a.type ?? "TRADE"),
      conditionId: a.conditionId ? String(a.conditionId) : undefined,
      title: String(a.title ?? a.question ?? ""),
      side: String(a.side ?? "BUY"),
      amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
      price: safeNum(a.price),
      outcome: String(a.outcome ?? "YES"),
      timestamp: String(a.timestamp ?? new Date().toISOString()),
    }));
  }

  if (valRes.status === "fulfilled" && valRes.value.ok) {
    const raw = await valRes.value.json();
    const arr = Array.isArray(raw) ? raw : [];
    portfolioValue = safeNum(arr[0]?.value ?? 0);
  }

  return { address, portfolioValue, positions, activity };
}

// Derive leaderboard entry metrics from a whale profile
export function deriveWhaleEntry(profile: WhaleProfile): WhaleEntry {
  const totalVolume = profile.activity.reduce((s, a) => s + a.amount, 0);
  const openPositions = profile.positions.filter((p) => p.size > 0).length;
  const recentTrades = profile.activity.length;

  // Win rate: positions with positive pnl / total positions with known pnl
  const resolved = profile.positions.filter((p) => p.cashPnl !== 0);
  const wins = resolved.filter((p) => p.cashPnl > 0).length;
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0;

  const lastActive =
    profile.activity.length > 0
      ? profile.activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          .timestamp
      : null;

  return {
    address: profile.address,
    portfolioValue: profile.portfolioValue,
    totalVolume,
    winRate,
    openPositions,
    recentTrades,
    lastActive,
  };
}

// React Query hooks
export function useWhaleProfile(address: string | null) {
  return useQuery<WhaleProfile>({
    queryKey: ["whale-profile", address],
    queryFn: () => fetchWhaleProfile(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
