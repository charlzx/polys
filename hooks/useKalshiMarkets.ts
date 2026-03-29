"use client";

import { useState, useEffect, useCallback } from "react";
import type { FlatKalshiMarket } from "@/services/kalshi";

interface UseKalshiMarketsOptions {
  limit?: number;
}

interface UseKalshiMarketsResult {
  markets: FlatKalshiMarket[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useKalshiMarkets({ limit = 200 }: UseKalshiMarketsOptions = {}): UseKalshiMarketsResult {
  const [markets, setMarkets] = useState<FlatKalshiMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kalshi?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { markets: FlatKalshiMarket[] } = await res.json();
      setMarkets(data.markets ?? []);
    } catch (err) {
      setError("Failed to load Kalshi markets. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { markets, isLoading, error, reload: load };
}
