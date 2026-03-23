import { useState, useEffect, useCallback, useRef } from "react";
import { TransformedMarket, OrderBook } from "@/services/polymarket";

const MARKETS_API = "/api/markets";
const CLOB_WS = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const POLL_INTERVAL_MS = 15_000;
const SINGLE_POLL_INTERVAL_MS = 10_000;
const WS_RECONNECT_DELAY_MS = 3_000;
// If no book event is received within this window, start polling REST as a fallback
const WS_HEALTH_TIMEOUT_MS = 15_000;

interface MarketUpdate {
  marketId: string;
  yesOdds: number;
  noOdds: number;
  volume24h: number;
  timestamp: number;
  volatility: "low" | "medium" | "high";
  momentum: "bullish" | "bearish" | "neutral";
  priceChange: number;
}

export interface TokenPair {
  marketId: string;
  yesTokenId: string;
}

interface UseMarketWebSocketOptions {
  marketIds?: string[];
  tokenPairs?: TokenPair[];
  enabled?: boolean;
}

interface GammaMarketSlim {
  id: string;
  outcomePrices?: string;
  volume24hr?: number | string;
  oneDayPriceChange?: number | string;
}


interface ClobBookLevel {
  price: string;
  size: string;
}

interface ClobBookEvent {
  event_type: "book";
  asset_id: string;
  market: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
  timestamp?: string;
  hash?: string;
}

interface ClobPriceChange {
  asset_id?: string;
  price: string;
  side: string;
  size: string;
  best_bid?: string;
  best_ask?: string;
  hash?: string;
}

interface ClobPriceChangeEvent {
  event_type: "price_change";
  asset_id?: string;
  changes?: ClobPriceChange[];
  price_changes?: ClobPriceChange[];
}

type ClobEvent = ClobBookEvent | ClobPriceChangeEvent | { event_type: string; asset_id?: string };


function parsePriceAndOdds(outcomePrices: string | undefined): { yes: number; no: number } | null {
  try {
    const prices = JSON.parse(outcomePrices || "[]");
    if (prices.length < 1) return null;
    const yes = Math.round(parseFloat(prices[0]) * 1000) / 10;
    return { yes, no: Math.round((100 - yes) * 10) / 10 };
  } catch {
    return null;
  }
}

function midPriceFromBook(bids: ClobBookLevel[], asks: ClobBookLevel[]): number | null {
  if (!bids.length && !asks.length) return null;
  const bestBid = bids.reduce(
    (max, b) => Math.max(max, parseFloat(b.price)),
    0
  );
  const bestAsk = asks.reduce(
    (min, a) => Math.min(min, parseFloat(a.price)),
    Infinity
  );
  if (bestBid <= 0 || bestAsk >= 1 || bestAsk <= bestBid) return null;
  return (bestBid + bestAsk) / 2;
}

function applyMidUpdate(
  marketId: string,
  mid: number,
  next: Map<string, MarketUpdate>,
  prev: Map<string, MarketUpdate>
) {
  const newYes = Math.round(mid * 1000) / 10;
  const existing = prev.get(marketId);
  const prevYes = existing?.yesOdds ?? newYes;
  const priceChange = parseFloat((newYes - prevYes).toFixed(2));
  const absChange = Math.abs(priceChange);
  next.set(marketId, {
    marketId,
    yesOdds: newYes,
    noOdds: Math.round((100 - newYes) * 10) / 10,
    volume24h: existing?.volume24h ?? 0,
    timestamp: Date.now(),
    volatility: absChange > 5 ? "high" : absChange > 2 ? "medium" : "low",
    momentum: priceChange > 0.5 ? "bullish" : priceChange < -0.5 ? "bearish" : "neutral",
    priceChange,
  });
}


export function useMarketWebSocket(options: UseMarketWebSocketOptions = {}) {
  const { marketIds = [], tokenPairs = [], enabled = true } = options;
  const [updates, setUpdates] = useState<Map<string, MarketUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsHealthTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBookEventRef = useRef<number | null>(null);
  const mountedRef = useRef(true);


  const pollMarkets = useCallback(async (ids: string[]) => {
    if (!ids.length || !mountedRef.current) return;
    try {
      // Fetch each tracked market individually to guarantee coverage regardless of volume rank
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`${MARKETS_API}/${id}`).then((r) => r.ok ? r.json() as Promise<GammaMarketSlim> : Promise.reject(r.status)))
      );
      const data: GammaMarketSlim[] = results
        .filter((r): r is PromiseFulfilledResult<GammaMarketSlim> => r.status === "fulfilled")
        .map((r) => r.value);
      const idSet = new Set(ids);

      setUpdates((prev) => {
        const next = new Map(prev);
        data.forEach((market) => {
          if (!idSet.has(market.id)) return;
          try {
            const odds = parsePriceAndOdds(market.outcomePrices);
            if (!odds) return;
            const prevYes = prevPricesRef.current.get(market.id) ?? odds.yes;
            const priceChange = parseFloat((odds.yes - prevYes).toFixed(2));
            prevPricesRef.current.set(market.id, odds.yes);

            const rawChange = market.oneDayPriceChange;
            const dayChange =
              rawChange !== undefined ? parseFloat(String(rawChange)) * 100 : priceChange;
            const absChange = Math.abs(dayChange);

            next.set(market.id, {
              marketId: market.id,
              yesOdds: odds.yes,
              noOdds: odds.no,
              volume24h:
                market.volume24hr !== undefined
                  ? parseFloat(String(market.volume24hr))
                  : (prev.get(market.id)?.volume24h ?? 0),
              timestamp: Date.now(),
              volatility: absChange > 5 ? "high" : absChange > 2 ? "medium" : "low",
              momentum: dayChange > 1 ? "bullish" : dayChange < -1 ? "bearish" : "neutral",
              priceChange,
            });
          } catch {
            // ignore parse errors for individual markets
          }
        });
        return next;
      });

      if (mountedRef.current) setIsConnected(true);
    } catch {
      if (mountedRef.current) setIsConnected(false);
    }
  }, []);


  const connectWebSocket = useCallback(
    (pairs: TokenPair[]) => {
      if (!pairs.length || !mountedRef.current) return;

      const tokenToMarket = new Map(pairs.map((p) => [p.yesTokenId, p.marketId]));
      const tokenIds = pairs.map((p) => p.yesTokenId).filter(Boolean);

      const ws = new WebSocket(CLOB_WS);
      wsRef.current = ws;
      // Reset liveness tracking so the watchdog fires correctly on each new connection
      lastBookEventRef.current = null;
      if (wsHealthTimerRef.current) { clearTimeout(wsHealthTimerRef.current); wsHealthTimerRef.current = null; }

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        ws.send(JSON.stringify({ assets_ids: tokenIds, type: "market" }));
        if (mountedRef.current) setIsConnected(true);

        // Health watchdog: if no book event in 15s, fall back to REST polling
        wsHealthTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          if (lastBookEventRef.current === null) {
            console.warn("[useMarketWebSocket] No book events received; starting REST fallback poll");
            pollMarkets(pairs.map((p) => p.marketId));
            pollIntervalRef.current = setInterval(
              () => pollMarkets(pairs.map((p) => p.marketId)),
              POLL_INTERVAL_MS
            );
          }
        }, WS_HEALTH_TIMEOUT_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const raw = JSON.parse(event.data as string) as ClobEvent | ClobEvent[];
          const events: ClobEvent[] = Array.isArray(raw) ? raw : [raw];

          setUpdates((prev) => {
            const next = new Map(prev);
            events.forEach((msg) => {
              if (msg.event_type === "book") {
                // book events carry top-level asset_id
                const assetId = msg.asset_id;
                if (!assetId) return;
                const marketId = tokenToMarket.get(assetId);
                if (!marketId) return;
                const bookMsg = msg as ClobBookEvent;
                // Record receipt and clear health watchdog on first book event
                if (!lastBookEventRef.current) {
                  lastBookEventRef.current = Date.now();
                  if (wsHealthTimerRef.current) { clearTimeout(wsHealthTimerRef.current); wsHealthTimerRef.current = null; }
                  if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
                }
                const mid = midPriceFromBook(bookMsg.bids ?? [], bookMsg.asks ?? []);
                if (mid === null) return;
                applyMidUpdate(marketId, mid, next, prev);
              } else if (msg.event_type === "price_change") {
                // price_change events include per-item asset_id (new schema) or top-level (old schema)
                const pcMsg = msg as ClobPriceChangeEvent;
                const changes = pcMsg.price_changes ?? pcMsg.changes ?? [];
                changes.forEach((c) => {
                  const assetId = c.asset_id ?? pcMsg.asset_id;
                  if (!assetId) return;
                  const marketId = tokenToMarket.get(assetId);
                  if (!marketId) return;
                  if (c.best_bid && c.best_ask) {
                    const bid = parseFloat(c.best_bid);
                    const ask = parseFloat(c.best_ask);
                    if (bid > 0 && ask < 1 && ask > bid) {
                      applyMidUpdate(marketId, (bid + ask) / 2, next, prev);
                    }
                  }
                });
              }
            });
            return next;
          });
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (mountedRef.current) setIsConnected(false);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        // Reconnect after a delay
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connectWebSocket(pairs);
        }, WS_RECONNECT_DELAY_MS);
      };
    },
    [] // connectWebSocket is stable — all state is via refs/setters
  );


  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || (marketIds.length === 0 && tokenPairs.length === 0)) {
      setIsConnected(false);
      return;
    }

    if (tokenPairs.length > 0) {
      // Use real CLOB WebSocket when token pairs are provided
      connectWebSocket(tokenPairs);
    } else {
      // Fall back to Gamma API polling when we only have market IDs
      pollMarkets(marketIds);
      pollIntervalRef.current = setInterval(() => pollMarkets(marketIds), POLL_INTERVAL_MS);
    }

    return () => {
      if (wsHealthTimerRef.current) { clearTimeout(wsHealthTimerRef.current); wsHealthTimerRef.current = null; }
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, marketIds.join(","), tokenPairs.map((p) => p.yesTokenId).join(",")]);

  const getMarketUpdate = useCallback(
    (marketId: string): MarketUpdate | undefined => updates.get(marketId),
    [updates]
  );

  const applyUpdatesToMarkets = useCallback(
    (markets: TransformedMarket[]): TransformedMarket[] =>
      markets.map((market) => {
        const u = updates.get(market.id);
        return u ? { ...market, yesOdds: u.yesOdds, noOdds: u.noOdds } : market;
      }),
    [updates]
  );

  const getMarketVolatility = useCallback(
    (marketId: string) => {
      const u = updates.get(marketId);
      return u
        ? { level: u.volatility, momentum: u.momentum, lastChange: u.priceChange }
        : null;
    },
    [updates]
  );

  // Backward-compatible no-op: initialization is implicit when real data arrives
  const initializeMarket = useCallback(
    (_marketId?: string, _initialOdds?: number, _initialVolume?: string | number) => {},
    []
  );

  return {
    isConnected,
    updates,
    getMarketUpdate,
    applyUpdatesToMarkets,
    initializeMarket,
    getMarketVolatility,
  };
}


export interface LiveTrade {
  id: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  timestamp: number;
}

export function useSingleMarketWebSocket(
  marketId: string | undefined,
  initialOdds?: number,
  yesTokenId?: string
) {
  const [currentOdds, setCurrentOdds] = useState<{ yes: number; no: number } | null>(
    initialOdds !== undefined ? { yes: initialOdds, no: 100 - initialOdds } : null
  );
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<"low" | "medium" | "high">("low");
  const [momentum, setMomentum] = useState<"bullish" | "bearish" | "neutral">("neutral");
  const [recentChanges, setRecentChanges] = useState<number[]>([]);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [liveOrderBook, setLiveOrderBook] = useState<OrderBook | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const wsHealthRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const latestOddsRef = useRef<number>(initialOdds ?? 50);
  const priceHistoryRef = useRef<number[]>([]);

  // Sync initial odds when they arrive
  useEffect(() => {
    if (initialOdds !== undefined && currentOdds === null) {
      setCurrentOdds({ yes: initialOdds, no: 100 - initialOdds });
      latestOddsRef.current = initialOdds;
    }
  }, [initialOdds, currentOdds]);

  const processOddsUpdate = useCallback((newYes: number) => {
    const prevYes = latestOddsRef.current;
    const priceChange = parseFloat((newYes - prevYes).toFixed(2));
    latestOddsRef.current = newYes;

    const now = Date.now();
    lastUpdateRef.current = now;
    setCurrentOdds({ yes: newYes, no: Math.round((100 - newYes) * 10) / 10 });
    setLastUpdate(now);

    priceHistoryRef.current = [...priceHistoryRef.current.slice(-14), priceChange];
    const history = priceHistoryRef.current;
    const rms = Math.sqrt(history.reduce((s, c) => s + c * c, 0) / history.length);
    const avg = history.reduce((s, c) => s + c, 0) / history.length;

    setVolatility(rms < 0.3 ? "low" : rms < 1.0 ? "medium" : "high");
    setMomentum(avg > 0.1 ? "bullish" : avg < -0.1 ? "bearish" : "neutral");
    setRecentChanges([...history]);
  }, []);


  useEffect(() => {
    mountedRef.current = true;
    if (!marketId) return;

    if (yesTokenId) {
      // Use real CLOB WebSocket
      const connect = () => {
        if (!mountedRef.current) return;
        const ws = new WebSocket(CLOB_WS);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          ws.send(JSON.stringify({ assets_ids: [yesTokenId], type: "market" }));
          // Start health watchdog — if no book event arrives within the window, fall back to REST polling
          wsHealthRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            if (lastUpdateRef.current === null) {
              console.warn("[useSingleMarketWebSocket] No book event received; starting REST fallback poll");
              if (mountedRef.current) setFeedError("No live data received — using REST fallback");
              const fallbackPoll = async () => {
                if (!mountedRef.current) return;
                try {
                  const res = await fetch(`${MARKETS_API}/${marketId}`);
                  if (res.ok) {
                    const data = await res.json() as { outcomePrices?: string };
                    const odds = parsePriceAndOdds(data.outcomePrices);
                    if (odds && mountedRef.current) processOddsUpdate(odds.yes);
                  }
                } catch (err) {
                  console.warn("[useSingleMarketWebSocket] REST fallback error", err);
                }
              };
              fallbackPoll();
              pollRef.current = setInterval(fallbackPoll, SINGLE_POLL_INTERVAL_MS);
            }
          }, WS_HEALTH_TIMEOUT_MS);
        };

        ws.onmessage = (event: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const raw = JSON.parse(event.data as string) as ClobEvent | ClobEvent[];
            const events: ClobEvent[] = Array.isArray(raw) ? raw : [raw];

            events.forEach((msg) => {
              // For book events, the top-level asset_id identifies the token.
              // For price_change events in the Sept-2025 schema, asset_id may be absent
              // at the top level and only present per item in price_changes[].
              // We let price_change events through and filter per-item below.
              if (msg.event_type === "book" && msg.asset_id !== yesTokenId) return;

              if (msg.event_type === "book") {
                const bookMsg = msg as ClobBookEvent;

                // Clear the health watchdog — WS is delivering events
                if (wsHealthRef.current) { clearTimeout(wsHealthRef.current); wsHealthRef.current = null; }
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                if (mountedRef.current) setFeedError(null);

                // Update live order book
                const rawBids = (bookMsg.bids ?? [])
                  .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
                  .slice(0, 8);
                const rawAsks = (bookMsg.asks ?? [])
                  .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                  .slice(0, 8);

                let bidTotal = 0;
                const bids = rawBids.map((b) => {
                  bidTotal += parseFloat(b.size);
                  return { price: parseFloat(b.price), size: Math.round(parseFloat(b.size)), total: bidTotal };
                });
                let askTotal = 0;
                const asks = rawAsks.map((a) => {
                  askTotal += parseFloat(a.size);
                  return { price: parseFloat(a.price), size: Math.round(parseFloat(a.size)), total: askTotal };
                });
                if (mountedRef.current) {
                  setLiveOrderBook({
                    bids,
                    asks: asks.reverse(),
                    maxTotal: Math.max(bidTotal, askTotal),
                    timestamp: bookMsg.timestamp ? parseInt(bookMsg.timestamp) : Date.now(),
                  });
                }

                // Update odds from mid-price
                const mid = midPriceFromBook(bookMsg.bids ?? [], bookMsg.asks ?? []);
                if (mid !== null && mountedRef.current) {
                  processOddsUpdate(Math.round(mid * 1000) / 10);
                }
              } else if (msg.event_type === "price_change") {
                const pcMsg = msg as ClobPriceChangeEvent;
                // Support both the old `changes` field and the Sept-2025 `price_changes` array
                const rawChanges = pcMsg.price_changes ?? pcMsg.changes ?? [];
                // Filter to only the yesToken's entries (per-item asset_id or top-level)
                const relevant = rawChanges.filter((c) =>
                  (c.asset_id ?? pcMsg.asset_id) === yesTokenId
                );
                if (relevant.length > 0 && mountedRef.current) {
                  const trades: LiveTrade[] = relevant
                    .filter((c) => parseFloat(c.size) > 0)
                    .map((c) => ({
                      id: c.hash ?? `${c.side}-${c.price}-${c.size}-${Date.now()}`,
                      side: c.side === "BUY" ? "buy" : "sell",
                      price: parseFloat(c.price),
                      size: Math.round(parseFloat(c.size)),
                      timestamp: Date.now(),
                    }));
                  if (trades.length > 0) {
                    setLiveTrades((prev) => [...trades, ...prev].slice(0, 20));
                  }
                }
              }
            });
          } catch {
            // ignore malformed messages
          }
        };

        ws.onerror = (ev) => {
          if (mountedRef.current) setFeedError("WebSocket error — reconnecting");
          console.warn("[useSingleMarketWebSocket] WS error", ev);
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          setFeedError("Feed disconnected — reconnecting");
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setFeedError(null);
              connect();
            }
          }, WS_RECONNECT_DELAY_MS);
        };
      };

      connect();
    } else {
      // Fall back to Gamma API polling when no CLOB token ID is available
      const poll = async () => {
        if (!mountedRef.current) return;
        try {
          const res = await fetch(`${MARKETS_API}/${marketId}`);
          if (!res.ok) {
            if (mountedRef.current) setFeedError(`Fetch failed (${res.status})`);
            return;
          }
          const data = await res.json();
          const odds = parsePriceAndOdds(data.outcomePrices);
          if (odds && mountedRef.current) {
            setFeedError(null);
            processOddsUpdate(odds.yes);
          }
        } catch (err) {
          if (mountedRef.current) setFeedError("Network error — retrying");
          console.warn("[useSingleMarketWebSocket] poll error", err);
        }
      };

      const initTimeout = setTimeout(poll, 2_000);
      pollRef.current = setInterval(poll, SINGLE_POLL_INTERVAL_MS);

      return () => {
        mountedRef.current = false;
        clearTimeout(initTimeout);
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    return () => {
      mountedRef.current = false;
      if (wsHealthRef.current) clearTimeout(wsHealthRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [marketId, yesTokenId]);

  return { currentOdds, lastUpdate, volatility, momentum, recentChanges, liveTrades, liveOrderBook, feedError };
}
