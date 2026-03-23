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

  const load = useCallback(async () => {
    if (!userId) {
      setStats(EMPTY);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

    setStats({
      watchedCount: watchlistRes.count ?? 0,
      activeAlertCount: alertsRes.count ?? 0,
      triggeredTodayCount: triggeredRes.count ?? 0,
    });
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, isLoading, reload: load };
}
