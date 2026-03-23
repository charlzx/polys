// Kalshi Trade API v2 types and server-side fetching

const KALSHI_EVENTS_URL = "https://api.elections.kalshi.com/trade-api/v2/events";

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

export interface FlatKalshiMarket {
  ticker: string;
  eventTitle: string;
  marketTitle: string;
  eventCategory: string;
  yesMid: number; // 0–1 probability
  yesBid: number;
  yesAsk: number;
  volumeFp: number;
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

// Fetch up to 3 pages of Kalshi events with nested markets (server-side)
export async function fetchKalshiEventsServer(): Promise<FlatKalshiMarket[]> {
  const allEvents: KalshiEvent[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 3; page++) {
    const url = new URL(KALSHI_EVENTS_URL);
    url.searchParams.set("limit", "100");
    url.searchParams.set("with_nested_markets", "true");
    url.searchParams.set("status", "open");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
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

    // Use the primary (first) binary market from each event
    const m = markets[0];
    const mid = kalshiMid(m);

    // Skip unpriced, near-zero, or near-certain markets
    if (mid < 0.03 || mid > 0.97) continue;

    result.push({
      ticker: m.ticker,
      eventTitle: event.title || m.title,
      marketTitle: m.title,
      eventCategory: event.category ?? "",
      yesMid: mid,
      yesBid: parseFloat(m.yes_bid_dollars ?? "0"),
      yesAsk: parseFloat(m.yes_ask_dollars ?? "0"),
      volumeFp: parseFloat(m.volume_fp ?? "0"),
    });
  }

  return result;
}
