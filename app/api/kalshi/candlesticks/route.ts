import { NextResponse } from "next/server";
import { fetchKalshiCandlesticksServer, hasKalshiAuth } from "@/services/kalshi";

export interface CandlestickPoint {
  t: number; // Unix ms timestamp
  v: number; // YES probability 0–100
}

// Module-level cache: { key -> { data, expiresAt } }
const cache = new Map<string, { data: CandlestickPoint[]; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// GET /api/kalshi/candlesticks?ticker=TICKER&days=7
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "";
  const days = Math.min(Math.max(1, parseInt(searchParams.get("days") ?? "7", 10)), 30);

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  if (!hasKalshiAuth()) {
    return NextResponse.json({ candlesticks: [] });
  }

  const cacheKey = `${ticker}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ candlesticks: cached.data });
  }

  const nowSec = Date.now() / 1000;
  const startSec = nowSec - days * 24 * 3600;

  // Use 4-hour intervals for ≤7 days, daily for longer windows
  const periodInterval = days <= 7 ? 240 : 1440;

  const candles = await fetchKalshiCandlesticksServer(ticker, startSec, nowSec, periodInterval);

  const points: CandlestickPoint[] = candles
    .filter((c) => c.price?.close != null)
    .map((c) => ({
      t: c.ts * 1000, // Convert to ms
      v: Math.round(parseFloat(c.price.close) * 100 * 10) / 10,
    }));

  cache.set(cacheKey, { data: points, expiresAt: Date.now() + CACHE_TTL_MS });

  return NextResponse.json({ candlesticks: points });
}
