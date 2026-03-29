"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  alertId: string | null;
  title: string;
  description: string;
  alertType: string;
  marketName: string | null;
  marketId: string | null;
  triggeredAt: string;
  timeAgo: string;
  read: boolean;
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

interface RawNotification {
  id: string;
  alert_id: string | null;
  alert_type: string;
  market_id: string | null;
  market_name: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

function mapRow(row: RawNotification): Notification {
  return {
    id: row.id,
    alertId: row.alert_id,
    title: alertTypeLabel(row.alert_type),
    description: row.message,
    alertType: alertTypeLabel(row.alert_type),
    marketName: row.market_name,
    marketId: row.market_id,
    triggeredAt: row.created_at,
    timeAgo: timeAgo(row.created_at),
    read: row.read,
  };
}

export function useNotifications(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("notifications")
      .select("id, alert_id, alert_type, market_id, market_name, message, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
    } else {
      setNotifications((data ?? []).map(mapRow));
    }
    setIsLoading(false);
  }, [supabase, userId]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Supabase Realtime subscription — updates the bell badge instantly on new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as RawNotification;
          setNotifications((prev) => {
            // Dedupe: don't add if already present (guards against race with initial load)
            if (prev.some((n) => n.id === newRow.id)) return prev;
            return [mapRow(newRow), ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as RawNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? mapRow(updated) : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }, [supabase, userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    count: unreadCount,
    isLoading,
    error,
    reload: load,
    markAsRead,
    markAllAsRead,
  };
}
