"use client";

import { useQuery } from "@tanstack/react-query";
import type { ArbitrageOpportunity, ArbitrageStat } from "@/services/arbitrage";

export type { ArbitrageOpportunity, ArbitrageStat };

interface ArbitrageResponse {
  opportunities: ArbitrageOpportunity[];
  stats: ArbitrageStat[];
}

async function fetchArbitrage(): Promise<ArbitrageResponse> {
  const res = await fetch("/api/arbitrage");
  if (!res.ok) throw new Error(`Arbitrage API error: ${res.status}`);
  return res.json();
}

export function useArbitrage() {
  return useQuery<ArbitrageResponse>({
    queryKey: ["arbitrage"],
    queryFn: fetchArbitrage,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}
