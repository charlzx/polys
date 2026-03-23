"use client";

import { useMemo } from "react";
import { useWhaleActivity } from "@/hooks/useWhales";
import { useMarkets } from "@/services/polymarket";

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
  timestamp: number;
}

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function truncate(text: string, max = 48): string {
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

  const events = useMemo<FeedEvent[]>(() => {
    const all: FeedEvent[] = [];

    // Whale events
    if (whaleData?.activity) {
      for (const a of whaleData.activity) {
        const isBuy = a.side === "BUY";
        all.push({
          id: `whale-${a.id}`,
          type: isBuy ? "whale_buy" : "whale_sell",
          title: `Whale ${isBuy ? "bought" : "sold"} ${formatDollar(a.amount)} ${a.outcome}`,
          subtitle: truncate(a.title),
          timestamp: new Date(a.timestamp).getTime(),
        });
      }
    }

    // Price movement events from 24h change
    if (markets) {
      const now = Date.now();
      for (const m of markets) {
        const change = m.change24h;
        if (Math.abs(change) >= 5) {
          const isUp = change > 0;
          all.push({
            id: `price-${m.id}`,
            type: isUp ? "price_up" : "price_down",
            title: `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${change}% in 24h`,
            subtitle: truncate(m.name),
            marketId: m.id,
            // approximate time — treat as "now" since change24h is a rolling window
            timestamp: now - Math.floor(Math.random() * 600_000),
          });
        }
      }

      // Markets approaching resolution within 48h
      for (const m of markets) {
        if (!m.endDate) continue;
        const end = new Date(m.endDate).getTime();
        const hoursLeft = (end - Date.now()) / 3_600_000;
        if (hoursLeft > 0 && hoursLeft <= 48) {
          const h = Math.round(hoursLeft);
          all.push({
            id: `milestone-${m.id}`,
            type: "milestone",
            title: `Resolves in ~${h}h`,
            subtitle: truncate(m.name),
            marketId: m.id,
            timestamp: Date.now() - 120_000,
          });
        }
      }
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
      .slice(0, limit)
      .map((e) => ({ ...e, subtitle: e.subtitle || relTime(e.timestamp) }));
  }, [whaleData, markets, limit]);

  return {
    events,
    isLoading: whaleLoading && marketsLoading,
  };
}
