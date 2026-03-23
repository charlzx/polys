import { useQuery } from "@tanstack/react-query";

const WHALES_API = "/api/whales";

export interface WhaleEntry {
  address: string;
  portfolioValue: number;
  totalVolume: number;
  winRate: number;
  openPositions: number;
  recentTrades: number;
  recentTradesList: Array<{
    title: string;
    side: string;
    outcome: string;
    amount: number;
    timestamp: string;
  }>;
  lastActive: string | null;
  hasData: boolean;
}

export interface WhalesLeaderboard {
  whales: WhaleEntry[];
}

export interface ActivityEvent {
  id: string;
  proxyWallet: string;
  conditionId?: string;
  title: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  amount: number;
  price: number;
  timestamp: string;
}

export interface ActivityResponse {
  activity: ActivityEvent[];
  source: "user" | "wallets";
}

async function fetchWhalesLeaderboard(limit: number): Promise<WhalesLeaderboard> {
  const res = await fetch(`${WHALES_API}?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch whale leaderboard");
  return res.json();
}

async function fetchWhaleActivity(limit: number, address?: string): Promise<ActivityResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (address) params.set("address", address);
  const res = await fetch(`${WHALES_API}/activity?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch whale activity");
  return res.json();
}

export function useWhalesLeaderboard(limit = 10) {
  return useQuery<WhalesLeaderboard>({
    queryKey: ["whales-leaderboard", limit],
    queryFn: () => fetchWhalesLeaderboard(limit),
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
