"use client";

import { useMemo } from "react";
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
  marketId?: string;
  href?: string;
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

export function useLiveFeed(limit = 20): {
  events: FeedEvent[];
  isLoading: boolean;
} {
  const { data: whaleData, isLoading: whaleLoading } = useWhaleActivity(30);
  const { data: markets, isLoading: marketsLoading } = useMarkets({
    limit: 30,
    active: true,
  });
  const { data: arbData, isLoading: arbLoading } = useArbitrage();

  // Subscribe WebSocket to top markets from the REST list for real-time price spikes
  const marketIds = useMemo(
    () => markets?.map((m) => m.id).slice(0, 20) ?? [],
    [markets]
  );
  const { updates: wsUpdates } = useMarketWebSocket({
    marketIds,
    enabled: marketIds.length > 0,
  });

  const events = useMemo<FeedEvent[]>(() => {
    const all: FeedEvent[] = [];
    const now = Date.now();

    // Whale events (link to /whales since ActivityEvent has no marketId)
    if (whaleData?.activity) {
      for (const a of whaleData.activity) {
        const isBuy = a.side === "BUY";
        all.push({
          id: `whale-${a.id}`,
          type: isBuy ? "whale_buy" : "whale_sell",
          title: `Whale ${isBuy ? "bought" : "sold"} ${formatDollar(a.amount)} ${a.outcome}`,
          subtitle: truncate(a.title),
          href: "/whales",
          timestamp: new Date(a.timestamp).getTime(),
        });
      }
    }

    // WebSocket real-time price spikes (>3% session move)
    if (markets) {
      const marketMap = new Map(markets.map((m) => [m.id, m]));
      for (const [id, update] of wsUpdates.entries()) {
        if (Math.abs(update.priceChange) > 3) {
          const market = marketMap.get(id);
          if (!market) continue;
          const isUp = update.priceChange > 0;
          all.push({
            id: `ws-${id}-${update.timestamp}`,
            type: isUp ? "price_up" : "price_down",
            title: `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${update.priceChange.toFixed(1)}% live move`,
            subtitle: truncate(market.name),
            marketId: id,
            timestamp: update.timestamp,
          });
        }
      }
    }

    // 24h price movers (>3%) from market snapshot — use stable index-based offset
    if (markets) {
      markets.forEach((m, i) => {
        const change = m.change24h;
        if (Math.abs(change) > 3) {
          const isUp = change > 0;
          // Stable timestamp: spread events 2 min apart so sort order is deterministic
          const ts = now - (i + 1) * 120_000;
          // Skip if WebSocket already covered this market with a live spike
          const wsKey = `ws-${m.id}`;
          const alreadyCovered = all.some((e) => e.id.startsWith(wsKey));
          if (!alreadyCovered) {
            all.push({
              id: `price-${m.id}`,
              type: isUp ? "price_up" : "price_down",
              title: `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${change}% in 24h`,
              subtitle: truncate(m.name),
              marketId: m.id,
              timestamp: ts,
            });
          }
        }
      });

      // Markets resolving within 48h
      markets.forEach((m, i) => {
        if (!m.endDate) return;
        const end = new Date(m.endDate).getTime();
        const hoursLeft = (end - now) / 3_600_000;
        if (hoursLeft > 0 && hoursLeft <= 48) {
          const h = Math.round(hoursLeft);
          all.push({
            id: `milestone-${m.id}`,
            type: "milestone",
            title: `Resolves in ~${h}h`,
            subtitle: truncate(m.name),
            marketId: m.id,
            timestamp: now - (markets.length + i + 1) * 120_000,
          });
        }
      });
    }

    // Arbitrage opportunities (top 3 by profit)
    if (arbData?.opportunities) {
      const active = arbData.opportunities
        .filter((o) => o.status === "active")
        .slice(0, 3);
      active.forEach((opp, i) => {
        all.push({
          id: `arb-${opp.id}`,
          type: "arb",
          title: `${opp.profit.toFixed(1)}% arb: ${opp.platform2} vs ${opp.platform1}`,
          subtitle: truncate(opp.market),
          href: "/arbitrage",
          timestamp: now - i * 180_000,
        });
      });
    }

    // Sort newest first and deduplicate by id
    const seen = new Set<string>();
    return all
      .filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }, [whaleData, markets, arbData, wsUpdates, limit]);

  return {
    events,
    isLoading: whaleLoading || marketsLoading || arbLoading,
  };
}
