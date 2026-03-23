import { useQuery } from "@tanstack/react-query";
import type { TransformedMarket } from "./polymarket";

export interface MarketSummary {
  sentiment: string;
  riskFactors: string[];
  priceMovementInsight: string;
  probabilityAssessment: string;
  oneLiner: string;
}

export interface MarketIntelligenceItem {
  marketId: string;
  marketName: string;
  category: string;
  insight: string;
  signal: "bullish" | "bearish" | "neutral";
  magnitude: "high" | "medium" | "low";
}

export interface WatchlistRecommendation {
  marketId: string;
  marketName: string;
  category: string;
  reason: string;
}

export async function fetchMarketSummary(
  marketId: string
): Promise<MarketSummary> {
  const res = await fetch(`/api/ai/market-summary?marketId=${encodeURIComponent(marketId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "AI summary unavailable");
  }
  return res.json();
}

export async function fetchMarketIntelligence(
  markets: TransformedMarket[]
): Promise<MarketIntelligenceItem[]> {
  const res = await fetch("/api/ai/intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markets: markets.slice(0, 10) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "AI intelligence unavailable");
  }
  return res.json();
}

export async function fetchWatchlistOneLiner(
  market: TransformedMarket
): Promise<string> {
  const res = await fetch(
    `/api/ai/market-summary?marketId=${encodeURIComponent(market.id)}&mode=oneliner`
  );
  if (!res.ok) return "";
  const data: MarketSummary = await res.json();
  return data.oneLiner ?? "";
}

export async function fetchWatchlistSuggestions(
  categories: string[],
  seenIds: string[],
  allMarkets: TransformedMarket[]
): Promise<WatchlistRecommendation[]> {
  const candidates = allMarkets
    .filter((m) => !seenIds.includes(m.id) && categories.includes(m.category))
    .slice(0, 20);

  if (candidates.length === 0) return [];

  const res = await fetch("/api/ai/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories, candidates }),
  });
  if (!res.ok) return [];
  return res.json();
}

// React Query hooks — 15-minute cache as per spec
export function useMarketSummary(marketId: string | undefined) {
  return useQuery({
    queryKey: ["ai-summary", marketId],
    queryFn: () => fetchMarketSummary(marketId!),
    enabled: !!marketId,
    staleTime: 15 * 60_000,
    retry: 1,
    retryDelay: 2000,
  });
}

export function useMarketIntelligence(markets: TransformedMarket[]) {
  return useQuery({
    queryKey: ["ai-intelligence", markets.map((m) => m.id).join(",")],
    queryFn: () =>
      fetchMarketIntelligence(markets).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden")) {
          return [] as MarketIntelligenceItem[];
        }
        console.error("[MarketIntelligence]", err);
        return [] as MarketIntelligenceItem[];
      }),
    enabled: markets.length > 0,
    staleTime: 15 * 60_000,
    retry: (failureCount, err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden")) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useWatchlistOneLiner(market: TransformedMarket | undefined) {
  return useQuery({
    queryKey: ["ai-oneliner", market?.id],
    queryFn: () => fetchWatchlistOneLiner(market!),
    enabled: !!market,
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function useWatchlistSuggestions(
  categories: string[],
  seenIds: string[],
  allMarkets: TransformedMarket[]
) {
  return useQuery({
    queryKey: ["ai-suggestions", categories.join(","), seenIds.slice(0, 10).join(",")],
    queryFn: () => fetchWatchlistSuggestions(categories, seenIds, allMarkets),
    enabled: categories.length > 0 && allMarkets.length > 0,
    staleTime: 15 * 60_000,
    retry: 1,
  });
}
