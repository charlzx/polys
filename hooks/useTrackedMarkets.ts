"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchMarketById } from "@/services/polymarket";
import type { TransformedMarket } from "@/services/polymarket";
import type { WatchlistItem } from "@/hooks/useWatchlist";

export interface TrackedMarket extends TransformedMarket {
  addedAt: string;
}

export function useTrackedMarkets(watchlistItems: WatchlistItem[]) {
  const [trackedMarkets, setTrackedMarkets] = useState<TrackedMarket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (watchlistItems.length === 0) {
      setTrackedMarkets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Fetch each watched market by ID in parallel
    const results = await Promise.allSettled(
      watchlistItems.map((item) => fetchMarketById(item.market_id))
    );

    const markets: TrackedMarket[] = results.map((result, index) => {
      const item = watchlistItems[index];
      if (result.status === "fulfilled" && result.value) {
        return { ...result.value, addedAt: item.added_at };
      }
      // Fallback to stored metadata when fetch fails for this specific market
      return {
        id: item.market_id,
        name: item.market_name,
        category: item.category,
        yesOdds: 50,
        noOdds: 50,
        change24h: 0,
        volume: "—",
        volume24h: "—",
        liquidity: "—",
        slug: item.market_id,
        endDate: "",
        description: "",
        active: true,
        addedAt: item.added_at,
      } as TrackedMarket;
    });

    setTrackedMarkets(markets);
    setIsLoading(false);
  }, [watchlistItems]);

  useEffect(() => {
    load();
  }, [load]);

  return { trackedMarkets, isLoading, reload: load };
}
