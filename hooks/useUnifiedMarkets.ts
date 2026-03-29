"use client";

import { useMemo } from "react";
import { useMarkets } from "@/services/polymarket";
import { useKalshiMarkets } from "@/hooks/useKalshiMarkets";
import { polymarketToUnified, kalshiToUnified } from "@/services/unified";
import type { UnifiedMarket } from "@/services/unified";

interface UseUnifiedMarketsOptions {
  limit?: number;
}

interface UseUnifiedMarketsResult {
  data: UnifiedMarket[];
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useUnifiedMarkets({ limit = 100 }: UseUnifiedMarketsOptions = {}): UseUnifiedMarketsResult {
  const {
    data: polyData,
    isLoading: polyLoading,
    error: polyError,
    refetch: polyRefetch,
  } = useMarkets({ limit: Math.min(limit, 50), active: true });

  const {
    markets: kalshiData,
    isLoading: kalshiLoading,
    error: kalshiError,
    reload: kalshiRefetch,
  } = useKalshiMarkets({ limit: Math.min(limit, 200) });

  const data = useMemo<UnifiedMarket[]>(() => {
    const poly = (polyData ?? []).map(polymarketToUnified);
    const kalshi = (kalshiData ?? []).map(kalshiToUnified);
    return [...poly, ...kalshi].sort((a, b) => b.volumeRaw - a.volumeRaw);
  }, [polyData, kalshiData]);

  const refetch = () => {
    polyRefetch();
    kalshiRefetch();
  };

  return {
    data,
    isLoading: polyLoading || kalshiLoading,
    error: !!(polyError && kalshiError),
    refetch,
  };
}
