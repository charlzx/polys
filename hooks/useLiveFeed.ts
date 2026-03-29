"use client";

import { useMemo, useRef } from "react";
import { useWhaleActivity } from "@/hooks/useWhales";
import { useMarkets } from "@/services/polymarket";
import { useArbitrage } from "@/hooks/useArbitrage";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";

export type FeedEventType =
  | "price_up"
  | "price_down"
  | "whale_buy"
  | "whale_sell"
  | "arb"
  | "milestone";

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  title: string;
  subtitle: string;
  marketId: string;
  timestamp: number;
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function truncate(text: string, max = 50): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Jaccard similarity for lightweight title matching (same stop-word set as arbitrage service)
const STOP_WORDS = new Set(["will","a","an","the","in","of","to","be","is","for","by","at","on","from","or","and","not","if","that","this","which","it","as"]);
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/\W+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export function useLiveFeed(limit = 20): {
  events: FeedEvent[];
  isLoading: boolean;
} {
  // Stable first-seen timestamps: persist across recomputes so events don't look artificially fresh
  const firstSeenRef = useRef<Map<string, number>>(new Map());

  const { data: whaleData, isLoading: whaleLoading } = useWhaleActivity(30);
  const { data: markets, isLoading: marketsLoading } = useMarkets({
    limit: 30,
    active: true,
  });
  const { data: arbData, isLoading: arbLoading } = useArbitrage();

  // Subscribe WebSocket to top markets for real-time price spikes
  // Prefer tokenPairs (CLOB WebSocket) when yesTokenId is available; fall back to marketIds (REST polling)
  const { tokenPairs, marketIds } = useMemo(() => {
    const slice = markets?.slice(0, 20) ?? [];
    const withToken = slice.filter((m) => m.yesTokenId);
    if (withToken.length > 0) {
      return {
        tokenPairs: withToken.map((m) => ({ marketId: m.id, yesTokenId: m.yesTokenId! })),
        marketIds: [] as string[],
      };
    }
    return { tokenPairs: [], marketIds: slice.map((m) => m.id) };
  }, [markets]);

  const { updates: wsUpdates } = useMarketWebSocket({
    marketIds,
    tokenPairs,
    enabled: tokenPairs.length > 0 || marketIds.length > 0,
  });

  // Build lookup: conditionId → marketId for whale event resolution
  const conditionToMarketId = useMemo(() => {
    if (!markets) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const m of markets) {
      if (m.conditionId) map.set(m.conditionId, m.id);
    }
    return map;
  }, [markets]);

  // Title-based fallback: precompute token sets for each market
  const marketTokens = useMemo(() => {
    if (!markets) return [] as Array<{ id: string; tokens: Set<string> }>;
    return markets.map((m) => ({ id: m.id, tokens: tokenize(m.name) }));
  }, [markets]);

  const events = useMemo<FeedEvent[]>(() => {
    const findMarketByTitle = (title: string): string | undefined => {
      const qTokens = tokenize(title);
      let bestId: string | undefined;
      let bestScore = 0.15;
      for (const { id, tokens } of marketTokens) {
        const score = jaccard(qTokens, tokens);
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      return bestId;
    };

    // Return a stable timestamp for an event id (cached at first-seen; never refreshed)
    const stableTs = (id: string, fallback: number): number => {
      if (!firstSeenRef.current.has(id)) firstSeenRef.current.set(id, fallback);
      return firstSeenRef.current.get(id)!;
    };

    const all: FeedEvent[] = [];
    const now = Date.now();

    // Whale events — resolve to market page via conditionId lookup or title match
    if (whaleData?.activity) {
      for (const a of whaleData.activity) {
        const mId =
          (a.conditionId ? conditionToMarketId.get(a.conditionId) : undefined)
          ?? findMarketByTitle(a.title);
        if (!mId) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[useLiveFeed] Whale event dropped — no market link for: "${a.title}" (conditionId: ${a.conditionId ?? "none"})`);
          }
          continue;
        }
        const isBuy = a.side === "BUY";
        all.push({
          id: `whale-${a.id}`,
          type: isBuy ? "whale_buy" : "whale_sell",
          title: `Whale ${isBuy ? "bought" : "sold"} ${formatDollar(a.amount)} ${a.outcome}`,
          subtitle: truncate(a.title),
          marketId: mId,
          timestamp: new Date(a.timestamp).getTime(),
        });
      }
    }

    if (markets) {
      const marketMap = new Map(markets.map((m) => [m.id, m]));

      // WebSocket real-time price spikes: >3% intra-session move since last observed price
      for (const [id, update] of wsUpdates.entries()) {
        if (Math.abs(update.priceChange) > 3) {
          const market = marketMap.get(id);
          if (!market) continue;
          const isUp = update.priceChange > 0;
          all.push({
            id: `ws-${id}-${Math.floor(update.timestamp / 60_000)}`,
            type: isUp ? "price_up" : "price_down",
            title: `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${update.priceChange.toFixed(1)}% live move`,
            subtitle: truncate(market.name),
            marketId: id,
            timestamp: update.timestamp,
          });
        }
      }

      // 24h price movers (>3% rolling 24h change from Polymarket REST) — stable deterministic timestamps
      const wsCoveredIds = new Set(
        [...wsUpdates.entries()]
          .filter(([, u]) => Math.abs(u.priceChange) > 3)
          .map(([id]) => id)
      );
      markets.forEach((m, i) => {
        if (wsCoveredIds.has(m.id)) return;
        const change = m.change24h;
        if (Math.abs(change) > 3) {
          const isUp = change > 0;
          const eid = `price-${m.id}`;
          all.push({
            id: eid,
            type: isUp ? "price_up" : "price_down",
            title: `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${change}% in 24h`,
            subtitle: truncate(m.name),
            marketId: m.id,
            timestamp: stableTs(eid, now - (i + 1) * 120_000),
          });
        }
      });

      // Markets resolving within 48h
      markets.forEach((m, i) => {
        if (!m.endDate) return;
        const end = new Date(m.endDate).getTime();
        const hoursLeft = (end - now) / 3_600_000;
        if (hoursLeft > 0 && hoursLeft <= 48) {
          const h = Math.round(hoursLeft);
          const eid = `milestone-${m.id}`;
          all.push({
            id: eid,
            type: "milestone",
            title: `Resolves in ~${h}h`,
            subtitle: truncate(m.name),
            marketId: m.id,
            timestamp: stableTs(eid, now - (markets.length + i + 1) * 120_000),
          });
        }
      });
    }

    // Arbitrage events — link to the matched Polymarket market page
    if (arbData?.opportunities) {
      arbData.opportunities
        .filter((o) => o.status === "active" && o.polyMarketId)
        .slice(0, 6)
        .forEach((opp, i) => {
          const eid = `arb-${opp.id}`;
          all.push({
            id: eid,
            type: "arb",
            title: `${opp.profit.toFixed(1)}% arb: ${opp.platform2} vs ${opp.platform1}`,
            subtitle: truncate(opp.market),
            marketId: opp.polyMarketId!,
            timestamp: stableTs(eid, now - i * 180_000),
          });
        });
    }

    // Sort newest first; deduplicate by id
    const seen = new Set<string>();
    return all
      .filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whaleData, markets, arbData, wsUpdates, conditionToMarketId, marketTokens, limit]);

  return {
    events,
    isLoading: whaleLoading || marketsLoading || arbLoading,
  };
}
