// Server-side arbitrage API route
// Fetches Polymarket + Kalshi live data, runs matching + profit calculation

import { NextResponse } from "next/server";
import { fetchKalshiEventsServer } from "@/services/kalshi";
import { detectArbitrage } from "@/services/arbitrage";
import type { TransformedMarket } from "@/services/polymarket";

const GAMMA_URL = "https://gamma-api.polymarket.com/markets";

// Module-level cache: persists across requests within the same server process.
// Keys are "polyMarketId:kalshiTicker" pairs; values are first-seen timestamps.
const timestampCache = new Map<string, Date>();

interface GammaMarket {
  id: string;
  question?: string;
  active?: boolean;
  closed?: boolean;
  outcomePrices?: string;
}

async function fetchPolymarketServer(): Promise<TransformedMarket[]> {
  const url = new URL(GAMMA_URL);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "200");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`);

  const raw: GammaMarket[] = await res.json();
  const markets: TransformedMarket[] = [];

  for (const m of raw) {
    if (!m.question || m.closed || !m.active) continue;

    let yesOdds = 50;
    try {
      const prices: string[] = JSON.parse(m.outcomePrices ?? '["0.5","0.5"]');
      yesOdds = Math.round(parseFloat(prices[0] ?? "0.5") * 100);
    } catch {
      // Keep default 50
    }

    // Skip markets that are essentially resolved (>97% or <3%)
    if (yesOdds < 3 || yesOdds > 97) continue;

    markets.push({
      id: m.id,
      name: m.question,
      description: "",
      category: "General",
      yesOdds,
      noOdds: 100 - yesOdds,
      change24h: 0,
      volume: "$0",
      volume24h: "$0",
      liquidity: "$0",
      endDate: "",
      active: true,
      slug: "",
    });
  }

  return markets;
}

export async function GET() {
  const emptyStats = [
    { label: "Opportunities Found", value: "0" },
    { label: "Average Profit", value: "0%" },
    { label: "Total Value Detected", value: "$0" },
  ];

  try {
    const [polyMarkets, kalshiMarkets] = await Promise.all([
      fetchPolymarketServer(),
      fetchKalshiEventsServer(),
    ]);

    const result = detectArbitrage(polyMarkets, kalshiMarkets, timestampCache);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Arbitrage API error:", err);
    // Return empty result rather than 502 to avoid UI error state
    return NextResponse.json({ opportunities: [], stats: emptyStats }, { status: 200 });
  }
}
