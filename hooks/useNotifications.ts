"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  title: string;
  description: string;
  alertType: string;
  marketName: string | null;
  triggeredAt: string;
  timeAgo: string;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function alertTypeLabel(type: string): string {
  switch (type) {
    case "odds": return "Odds Alert";
    case "volume": return "Volume Alert";
    case "new": return "New Market";
    case "arbitrage": return "Arbitrage";
    default: return "Alert";
  }
}

export function useNotifications(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("alerts")
      .select("id, name, alert_type, market_name, condition_text, last_triggered_at")
      .eq("user_id", userId)
      .eq("status", "triggered")
      .gte("last_triggered_at", since24h)
      .order("last_triggered_at", { ascending: false })
      .limit(10);

    const rows = data ?? [];
    setNotifications(
      rows.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.condition_text ?? `${alertTypeLabel(row.alert_type)} triggered`,
        alertType: alertTypeLabel(row.alert_type),
        marketName: row.market_name,
        triggeredAt: row.last_triggered_at,
        timeAgo: timeAgo(row.last_triggered_at),
      }))
    );
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { notifications, count: notifications.length, isLoading, reload: load };
}
