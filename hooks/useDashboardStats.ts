"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DashboardStats {
  watchedCount: number;
  activeAlertCount: number;
  triggeredTodayCount: number;
}

const EMPTY: DashboardStats = {
  watchedCount: 0,
  activeAlertCount: 0,
  triggeredTodayCount: 0,
};

export function useDashboardStats(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setStats(EMPTY);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const [watchlistRes, alertsRes, triggeredRes] = await Promise.all([
        supabase
          .from("watchlist")
          .select("market_id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "triggered")
          .gte("last_triggered_at", since24h),
      ]);

      const err = watchlistRes.error ?? alertsRes.error ?? triggeredRes.error;
      if (err) {
        setError(err.message);
      } else {
        setStats({
          watchedCount: watchlistRes.count ?? 0,
          activeAlertCount: alertsRes.count ?? 0,
          triggeredTodayCount: triggeredRes.count ?? 0,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    }
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, isLoading, error, reload: load };
}
