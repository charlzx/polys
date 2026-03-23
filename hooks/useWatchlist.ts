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
  const [isLoading, setIsLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    if (!user?.id) {
      setWatchlistIds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("watchlist")
      .select("market_id")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    setWatchlistIds((data ?? []).map((row: { market_id: string }) => row.market_id));
    setIsLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const addToWatchlist = useCallback(
    async (marketId: string, marketName: string, category: string) => {
      if (!user?.id) return;
      await supabase.from("watchlist").upsert(
        { user_id: user.id, market_id: marketId, market_name: marketName, category },
        { onConflict: "user_id,market_id" }
      );
      setWatchlistIds((prev) => (prev.includes(marketId) ? prev : [marketId, ...prev]));
    },
    [supabase, user?.id]
  );

  const removeFromWatchlist = useCallback(
    async (marketId: string) => {
      if (!user?.id) return;
      await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("market_id", marketId);
      setWatchlistIds((prev) => prev.filter((id) => id !== marketId));
    },
    [supabase, user?.id]
  );

  const toggleWatchlist = useCallback(
    async (marketId: string, marketName: string, category: string) => {
      if (watchlistIds.includes(marketId)) {
        await removeFromWatchlist(marketId);
        return false;
      } else {
        await addToWatchlist(marketId, marketName, category);
        return true;
      }
    },
    [watchlistIds, addToWatchlist, removeFromWatchlist]
  );

  const isWatched = useCallback(
    (marketId: string) => watchlistIds.includes(marketId),
    [watchlistIds]
  );

  return {
    watchlistIds,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatched,
    reload: loadWatchlist,
  };
}
