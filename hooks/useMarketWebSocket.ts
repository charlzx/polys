import { useState, useEffect, useCallback, useRef } from 'react';
import { TransformedMarket } from '@/services/polymarket';

const MARKETS_API = "/api/markets";
const POLL_INTERVAL_MS = 15_000;

interface MarketUpdate {
  marketId: string;
  yesOdds: number;
  noOdds: number;
  volume24h: number;
  timestamp: number;
  volatility: 'low' | 'medium' | 'high';
  momentum: 'bullish' | 'bearish' | 'neutral';
  priceChange: number;
}

interface UseMarketWebSocketOptions {
  marketIds?: string[];
  enabled?: boolean;
}

interface GammaMarketSlim {
  id: string;
  outcomePrices?: string;
  volume24hr?: number | string;
  oneDayPriceChange?: number | string;
}

// ─── Multi-market polling hook ─────────────────────────────────────────────────

export function useMarketWebSocket(options: UseMarketWebSocketOptions = {}) {
  const { marketIds = [], enabled = true } = options;
  const [updates, setUpdates] = useState<Map<string, MarketUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevPricesRef = useRef<Map<string, number>>(new Map());

  const pollMarkets = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    try {
      // Poll the top active markets — the IDs we care about are almost always
      // in the top-volume set.
      const sp = new URLSearchParams({
        limit: "100",
        active: "true",
        closed: "false",
        order: "volume24hr",
        ascending: "false",
      });

      const res = await fetch(`${MARKETS_API}?${sp.toString()}`);
      if (!res.ok) return;

      const data: GammaMarketSlim[] = await res.json();
      const idSet = new Set(ids);

      setUpdates((prev) => {
        const next = new Map(prev);

        data.forEach((market) => {
          if (!idSet.has(market.id)) return;

          try {
            const prices = JSON.parse(market.outcomePrices || "[]");
            if (prices.length < 2) return;

            const newYes = Math.round(parseFloat(prices[0]) * 1000) / 10;
            const newNo = Math.round((1 - parseFloat(prices[0])) * 1000) / 10;

            const prevYes = prevPricesRef.current.get(market.id) ?? newYes;
            const priceChange = parseFloat((newYes - prevYes).toFixed(2));
            prevPricesRef.current.set(market.id, newYes);

            const rawChange = market.oneDayPriceChange;
            const dayChange = rawChange !== undefined
              ? parseFloat(String(rawChange)) * 100
              : priceChange;

            const absChange = Math.abs(dayChange);
            const volatility: 'low' | 'medium' | 'high' =
              absChange > 5 ? 'high' : absChange > 2 ? 'medium' : 'low';

            const momentum: 'bullish' | 'bearish' | 'neutral' =
              dayChange > 1 ? 'bullish' : dayChange < -1 ? 'bearish' : 'neutral';

            const vol24hRaw = market.volume24hr;
            const vol24h = vol24hRaw !== undefined
              ? parseFloat(String(vol24hRaw))
              : (prev.get(market.id)?.volume24h ?? 0);

            next.set(market.id, {
              marketId: market.id,
              yesOdds: newYes,
              noOdds: newNo,
              volume24h: vol24h,
              timestamp: Date.now(),
              volatility,
              momentum,
              priceChange,
            });
          } catch {
            // ignore individual parse errors
          }
        });

        return next;
      });

      setIsConnected(true);
    } catch {
      // Network error — keep existing state, mark disconnected
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || marketIds.length === 0) {
      setIsConnected(false);
      return;
    }

    // Initial poll immediately, then on interval
    pollMarkets(marketIds);
    intervalRef.current = setInterval(() => pollMarkets(marketIds), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, marketIds.join(','), pollMarkets]);

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

  // No-op: with real data, initialization is implicit
  const initializeMarket = useCallback(() => {}, []);

  return {
    isConnected,
    updates,
    getMarketUpdate,
    applyUpdatesToMarkets,
    initializeMarket,
    getMarketVolatility,
  };
}

// ─── Single-market polling hook ────────────────────────────────────────────────

export function useSingleMarketWebSocket(
  marketId: string | undefined,
  initialOdds?: number
) {
  const [currentOdds, setCurrentOdds] = useState<{ yes: number; no: number } | null>(
    initialOdds !== undefined ? { yes: initialOdds, no: 100 - initialOdds } : null
  );
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<'low' | 'medium' | 'high'>('low');
  const [momentum, setMomentum] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [recentChanges, setRecentChanges] = useState<number[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestOddsRef = useRef<number>(initialOdds ?? 50);

  // Sync initial odds when they arrive from parent query
  useEffect(() => {
    if (initialOdds !== undefined && currentOdds === null) {
      setCurrentOdds({ yes: initialOdds, no: 100 - initialOdds });
      latestOddsRef.current = initialOdds;
    }
  }, [initialOdds, currentOdds]);

  useEffect(() => {
    if (!marketId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${MARKETS_API}/${marketId}`);
        if (!res.ok) return;

        const data = await res.json();
        const prices = JSON.parse(data.outcomePrices || "[]");
        if (prices.length < 2) return;

        const newYes = Math.round(parseFloat(prices[0]) * 1000) / 10;
        const newNo = Math.round((1 - parseFloat(prices[0])) * 1000) / 10;
        const priceChange = parseFloat((newYes - latestOddsRef.current).toFixed(2));

        latestOddsRef.current = newYes;

        setCurrentOdds({ yes: newYes, no: newNo });
        setLastUpdate(Date.now());

        setRecentChanges((prev) => {
          const updated = [...prev.slice(-14), priceChange];

          const rms = Math.sqrt(
            updated.reduce((s, c) => s + c * c, 0) / updated.length
          );
          setVolatility(rms < 0.3 ? 'low' : rms < 1.0 ? 'medium' : 'high');

          const avg = updated.reduce((s, c) => s + c, 0) / updated.length;
          setMomentum(avg > 0.1 ? 'bullish' : avg < -0.1 ? 'bearish' : 'neutral');

          return updated;
        });
      } catch {
        // ignore network errors, keep existing state
      }
    };

    // Initial poll after a short delay (parent query likely already has fresh data)
    const initTimeout = setTimeout(poll, 2_000);
    intervalRef.current = setInterval(poll, 10_000);

    return () => {
      clearTimeout(initTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [marketId]);

  return { currentOdds, lastUpdate, volatility, momentum, recentChanges };
}
