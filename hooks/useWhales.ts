import { useQuery } from "@tanstack/react-query";

const WHALES_API = "/api/whales";

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
  image?: string | null;
  endDate?: string | null;
  lastActivity: string;
}

export interface WhalesSummary {
  markets: WhaleMarket[];
  totalVolume24h: number;
  totalLiquidity: number;
  largestMove: { market: string; change: number } | null;
}

export interface ActivityEvent {
  id: string;
  marketId: string;
  marketName: string;
  marketSlug: string;
  category: string;
  action: "BUY" | "SELL";
  outcome: "YES" | "NO";
  size: number;
  price: number;
  timestamp: string;
  image?: string | null;
}

export interface ActivityResponse {
  activity: ActivityEvent[];
  source: "user" | "markets";
}

async function fetchWhaleSummary(limit: number): Promise<WhalesSummary> {
  const res = await fetch(`${WHALES_API}?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch whale data");
  return res.json();
}

async function fetchWhaleActivity(limit: number, address?: string): Promise<ActivityResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (address) params.set("address", address);
  const res = await fetch(`${WHALES_API}/activity?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch whale activity");
  return res.json();
}

export function useWhaleSummary(limit = 20) {
  return useQuery<WhalesSummary>({
    queryKey: ["whale-summary", limit],
    queryFn: () => fetchWhaleSummary(limit),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useWhaleActivity(limit = 20, address?: string) {
  return useQuery<ActivityResponse>({
    queryKey: ["whale-activity", limit, address],
    queryFn: () => fetchWhaleActivity(limit, address),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}
