// Kalshi Trade API v2 types and server-side fetching

const BASE_URL = "https://trading-api.kalshi.com/trade-api/v2";

// Returns auth headers — adds Bearer token only when KALSHI_API_KEY is set.
// Safe to call from server-side route handlers and server components.
function kalshiHeaders(): Record<string, string> {
  const key = process.env.KALSHI_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  return headers;
}

export function hasKalshiAuth(): boolean {
  return Boolean(process.env.KALSHI_API_KEY);
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  yes_bid_dollars: string;
  yes_ask_dollars: string;
  no_bid_dollars: string;
  no_ask_dollars: string;
  volume_fp: string;
  liquidity_dollars: string;
  status: string;
  close_time: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  markets?: KalshiMarket[];
}

export interface KalshiOrderBookEntry {
  price: string;
  quantity: number;
}

export interface KalshiOrderBook {
  ticker: string;
  yes: KalshiOrderBookEntry[];
  no: KalshiOrderBookEntry[];
}

export interface KalshiCandlestick {
  ts: number;
  price: {
    open: string;
    close: string;
    high: string;
    low: string;
  };
  volume: string;
}

export interface FlatKalshiMarket {
  ticker: string;
  eventTicker: string;
  eventTitle: string;
  marketTitle: string;
  eventCategory: string;
  yesMid: number; // 0–1 probability
  yesBid: number;
  yesAsk: number;
  volumeFp: number;
  closeTime: string; // ISO 8601 — market end date
  externalUrl: string; // canonical kalshi.com URL
  change24h: number; // percentage points, 0 if unavailable
}

// Returns mid-price as 0–1 probability from a KalshiMarket
export function kalshiMid(market: KalshiMarket): number {
  const bid = parseFloat(market.yes_bid_dollars ?? "0");
  const ask = parseFloat(market.yes_ask_dollars ?? "0");
  if (bid <= 0 && ask <= 0) return 0;
  if (bid <= 0) return ask;
  if (ask <= 0) return bid;
  return (bid + ask) / 2;
}

// Fetch a single Kalshi market by ticker (server-side)
export async function fetchKalshiMarketServer(ticker: string): Promise<KalshiMarket | null> {
  const res = await fetch(`${BASE_URL}/markets/${encodeURIComponent(ticker)}`, {
    headers: kalshiHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.market as KalshiMarket) ?? null;
}

// Fetch the order book for a Kalshi market ticker (server-side)
export async function fetchKalshiOrderbookServer(ticker: string): Promise<KalshiOrderBook | null> {
  const res = await fetch(`${BASE_URL}/markets/${encodeURIComponent(ticker)}/orderbook`, {
    headers: kalshiHeaders(),
    next: { revalidate: 10 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.orderbook as KalshiOrderBook) ?? null;
}

// Fetch Kalshi markets list from /markets endpoint (server-side)
// Returns a flat list of actively-priced markets without event context.
export async function fetchKalshiMarketsListServer(limit = 200): Promise<KalshiMarket[]> {
  const url = new URL(`${BASE_URL}/markets`);
  url.searchParams.set("limit", String(Math.min(limit, 200)));
  url.searchParams.set("status", "active");

  const res = await fetch(url.toString(), {
    headers: kalshiHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.markets as KalshiMarket[]) ?? [];
}

// Fetch candlestick data for a single market.
// period_interval is in minutes (60 = hourly, 1440 = daily).
// Requires KALSHI_API_KEY — returns [] gracefully if unauthenticated.
export async function fetchKalshiCandlesticksServer(
  ticker: string,
  startTs: number,
  endTs: number,
  periodInterval: number = 60
): Promise<KalshiCandlestick[]> {
  if (!hasKalshiAuth()) return [];

  const url = new URL(`${BASE_URL}/markets/${encodeURIComponent(ticker)}/candlesticks`);
  url.searchParams.set("start_ts", String(Math.floor(startTs)));
  url.searchParams.set("end_ts", String(Math.floor(endTs)));
  url.searchParams.set("period_interval", String(periodInterval));

  try {
    const res = await fetch(url.toString(), {
      headers: kalshiHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.candlesticks as KalshiCandlestick[]) ?? [];
  } catch {
    return [];
  }
}

// Compute 24h change from a set of hourly candlesticks.
// Returns percentage points (e.g., +3 means probability went from 55% to 58%).
function compute24hChange(candles: KalshiCandlestick[]): number {
  if (candles.length < 2) return 0;
  const earliest = parseFloat(candles[0].price.close ?? "0");
  const latest = parseFloat(candles[candles.length - 1].price.close ?? "0");
  if (earliest <= 0) return 0;
  return Math.round((latest - earliest) * 100 * 10) / 10;
}

// Fetch up to 3 pages of Kalshi events with nested markets (server-side)
export async function fetchKalshiEventsServer(): Promise<FlatKalshiMarket[]> {
  const allEvents: KalshiEvent[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 3; page++) {
    const url = new URL(`${BASE_URL}/events`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("with_nested_markets", "true");
    url.searchParams.set("status", "open");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: kalshiHeaders(),
      next: { revalidate: 30 },
    });
    if (!res.ok) break;

    const data = await res.json();
    const events: KalshiEvent[] = data.events ?? [];
    allEvents.push(...events);
    cursor = data.cursor;
    if (!cursor || events.length < 100) break;
  }

  const result: FlatKalshiMarket[] = [];

  for (const event of allEvents) {
    const markets = event.markets ?? [];
    if (markets.length === 0) continue;

    const m = markets[0];
    const mid = kalshiMid(m);

    if (mid < 0.03 || mid > 0.97) continue;

    result.push({
      ticker: m.ticker,
      eventTicker: event.event_ticker,
      eventTitle: event.title || m.title,
      marketTitle: m.title,
      eventCategory: event.category ?? "",
      yesMid: mid,
      yesBid: parseFloat(m.yes_bid_dollars ?? "0"),
      yesAsk: parseFloat(m.yes_ask_dollars ?? "0"),
      volumeFp: parseFloat(m.volume_fp ?? "0"),
      closeTime: m.close_time ?? "",
      externalUrl: `https://kalshi.com/markets/${event.event_ticker.toLowerCase()}`,
      change24h: 0,
    });
  }

  // Enrich top 50 markets by volume with real 24h change when API key is set
  if (hasKalshiAuth() && result.length > 0) {
    const top50 = [...result]
      .sort((a, b) => b.volumeFp - a.volumeFp)
      .slice(0, 50);

    const nowSec = Date.now() / 1000;
    const ago24hSec = nowSec - 24 * 3600;

    const candleResults = await Promise.allSettled(
      top50.map((m) => fetchKalshiCandlesticksServer(m.ticker, ago24hSec, nowSec, 60))
    );

    const changeMap = new Map<string, number>();
    top50.forEach((m, i) => {
      const settled = candleResults[i];
      if (settled.status === "fulfilled" && settled.value.length >= 2) {
        changeMap.set(m.ticker, compute24hChange(settled.value));
      }
    });

    for (const m of result) {
      if (changeMap.has(m.ticker)) {
        m.change24h = changeMap.get(m.ticker)!;
      }
    }
  }

  return result;
}
