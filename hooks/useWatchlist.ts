"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WatchlistItem {
  market_id: string;
  market_name: string;
  category: string;
  added_at: string;
}

export function useWatchlist() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    if (!user?.id) {
      setWatchlistIds([]);
      setWatchlistItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("watchlist")
      .select("market_id, market_name, category, added_at")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    const rows = (data ?? []) as WatchlistItem[];
    setWatchlistItems(rows);
    setWatchlistIds(rows.map((r) => r.market_id));
    setIsLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const addToWatchlist = useCallback(
    async (marketId: string, marketName: string, category: string) => {
      if (!user?.id) return;
      const newItem: WatchlistItem = { market_id: marketId, market_name: marketName, category, added_at: new Date().toISOString() };
      // Optimistic update first
      setWatchlistIds((prev) => (prev.includes(marketId) ? prev : [marketId, ...prev]));
      setWatchlistItems((prev) => (prev.some((i) => i.market_id === marketId) ? prev : [newItem, ...prev]));
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        market_id: marketId,
        market_name: marketName,
        category,
      });
      // Ignore unique-constraint violations (already watched) — non-fatal
      if (error && error.code !== "23505") {
        console.warn("[useWatchlist] addToWatchlist error:", error.message);
        // Rollback optimistic update on unexpected error
        setWatchlistIds((prev) => prev.filter((id) => id !== marketId));
        setWatchlistItems((prev) => prev.filter((i) => i.market_id !== marketId));
      }
    },
    [supabase, user?.id]
  );

  const removeFromWatchlist = useCallback(
    async (marketId: string) => {
      if (!user?.id) return;
      // Snapshot for rollback
      const prevIds = watchlistIds;
      const prevItems = watchlistItems;
      // Optimistic update first
      setWatchlistIds((prev) => prev.filter((id) => id !== marketId));
      setWatchlistItems((prev) => prev.filter((i) => i.market_id !== marketId));
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("market_id", marketId);
      if (error) {
        console.warn("[useWatchlist] removeFromWatchlist error:", error.message);
        // Rollback
        setWatchlistIds(prevIds);
        setWatchlistItems(prevItems);
      }
    },
    [supabase, user?.id, watchlistIds, watchlistItems]
  );

  // Returns true = added, false = removed, null = not authenticated
  const toggleWatchlist = useCallback(
    async (marketId: string, marketName: string, category: string): Promise<boolean | null> => {
      if (!user?.id) return null;
      if (watchlistIds.includes(marketId)) {
        await removeFromWatchlist(marketId);
        return false;
      } else {
        await addToWatchlist(marketId, marketName, category);
        return true;
      }
    },
    [user?.id, watchlistIds, addToWatchlist, removeFromWatchlist]
  );

  const isWatched = useCallback(
    (marketId: string) => watchlistIds.includes(marketId),
    [watchlistIds]
  );

  return {
    watchlistIds,
    watchlistItems,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatched,
    reload: loadWatchlist,
  };
}
