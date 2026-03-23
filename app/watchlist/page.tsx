"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  TrendUpIcon,
  TrendDownIcon,
  ArrowUpRight,
  ArrowLeft,
  Sparkle,
} from "@phosphor-icons/react";
import { useMarkets, type TransformedMarket } from "@/services/polymarket";
import { useWatchlistOneLiner, useWatchlistSuggestions } from "@/services/ai";
import { motion } from "framer-motion";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AppHeader } from "@/components/AppHeader";

// One-liner AI summary for a single watchlist market card
function AiOneLiner({ market }: { market: TransformedMarket }) {
  const { data: oneLiner, isLoading } = useWatchlistOneLiner(market);

  if (isLoading) {
    return <Skeleton className="h-3 w-full mt-2" />;
  }
  if (!oneLiner) return null;
  return (
    <p className="text-caption text-muted-foreground mt-2 italic line-clamp-2 flex items-start gap-1">
      <Sparkle className="h-3 w-3 text-primary shrink-0 mt-0.5" weight="fill" />
      {oneLiner}
    </p>
  );
}

function MarketCard({ market, onToggleWatch, index }: { 
  market: TransformedMarket; 
  onToggleWatch: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card className="group hover:border-primary/30 transition-base relative">
        <CardContent className="p-4">
          {/* Watchlist Star */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleWatch();
            }}
            className="absolute top-4 right-4 text-primary hover:text-destructive transition-base cursor-pointer"
            aria-label="Remove from watchlist"
          >
            <Star weight="fill" className="h-4 w-4" />
          </button>

          {/* Category Badge */}
          <Badge variant="outline" className="text-caption mb-3">
            {market.category}
          </Badge>

          {/* Market Title */}
          <h3 className="text-small font-medium mb-3 pr-6 line-clamp-2 min-h-[2.5rem]">
            {market.name}
          </h3>

          {/* Odds Display */}
          <div className="flex items-center gap-6 mb-3">
            <div>
              <div className="text-title font-bold text-success">{market.yesOdds}%</div>
              <div className="text-caption text-muted-foreground">YES</div>
            </div>
            <div>
              <div className="text-title font-bold text-destructive">{market.noOdds}%</div>
              <div className="text-caption text-muted-foreground">NO</div>
            </div>
            <div className="ml-auto">
              <div className={`flex items-center text-small font-medium ${
                market.change24h >= 0 ? "text-success" : "text-destructive"
              }`}>
                {market.change24h >= 0 ? (
                  <TrendUpIcon weight="bold" className="h-3 w-3 mr-1" />
                ) : (
                  <TrendDownIcon weight="bold" className="h-3 w-3 mr-1" />
                )}
                {market.change24h >= 0 ? "+" : ""}{market.change24h}%
              </div>
              <div className="text-caption text-muted-foreground text-right">24h</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-caption text-muted-foreground mb-3">
            <span>Vol: {market.volume}</span>
            <span>Liq: {market.liquidity}</span>
          </div>

          {/* AI one-liner */}
          <AiOneLiner market={market} />

          {/* Action Button */}
          <Link href={`/markets/${market.id}`} className="block mt-3">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all cursor-pointer"
            >
              View Details
              <ArrowUpRight weight="bold" className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MarketSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-5 w-16 mb-3" />
        <Skeleton className="h-10 w-full mb-3" />
        <div className="flex gap-6 mb-3">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-12 w-16" />
        </div>
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

// Smart suggestions panel
function SuggestionsPanel({
  categories,
  watchedIds,
  allMarkets,
  onAdd,
}: {
  categories: string[];
  watchedIds: string[];
  allMarkets: TransformedMarket[];
  onAdd: (market: TransformedMarket) => void;
}) {
  const { data: suggestions, isLoading } = useWatchlistSuggestions(
    categories,
    watchedIds,
    allMarkets
  );

  // Map suggestions back to full market objects
  const suggestedMarkets = useMemo(() => {
    if (!suggestions) return [];
    return suggestions
      .map((s) => {
        const m = allMarkets.find((m) => m.id === s.marketId);
        return m ? { market: m, reason: s.reason } : null;
      })
      .filter(Boolean) as { market: TransformedMarket; reason: string }[];
  }, [suggestions, allMarkets]);

  if (categories.length === 0 || (suggestedMarkets.length === 0 && !isLoading)) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Sparkle className="h-4 w-4 text-primary" weight="fill" />
        <CardTitle className="text-subtitle">Suggested for You</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {suggestedMarkets.map(({ market, reason }) => (
              <div
                key={market.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium line-clamp-1">{market.name}</p>
                  <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">{reason}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8"
                  onClick={() => onAdd(market)}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Watch
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WatchlistPage() {
  const { toast } = useToast();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { watchlistIds, toggleWatchlist, addToWatchlist, isLoading: watchlistLoading } = useWatchlist();

  // Fetch markets
  const { data: markets, isLoading: marketsLoading } = useMarkets({
    limit: 50,
    active: true,
  });

  const isLoading = watchlistLoading || marketsLoading;

  // Filter markets to only show watchlisted ones
  const watchlistedMarkets = useMemo(() => {
    if (!markets) return [];
    return markets.filter((m) => watchlistIds.includes(m.id));
  }, [markets, watchlistIds]);

  // Derive top categories from watchlisted markets for smart suggestions
  const watchedCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    watchlistedMarkets.forEach((m) => {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
  }, [watchlistedMarkets]);

  const handleToggleWatch = async (market: TransformedMarket) => {
    const added = await toggleWatchlist(market.id, market.name, market.category);
    toast({
      title: added ? "Added to watchlist" : "Removed from watchlist",
      description: added
        ? `"${market.name}" added to your watchlist`
        : `"${market.name}" removed from your watchlist`,
    });
  };

  const handleAddSuggested = (market: TransformedMarket) => {
    addToWatchlist(market.id, market.name, market.category);
    toast({
      title: "Added to watchlist",
      description: `"${market.name}" added to your watchlist`,
    });
  };

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0">
        <div className="container py-8">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
              <Link href="/markets">
                <ArrowLeft weight="bold" className="mr-2 h-4 w-4" />
                Back to Markets
              </Link>
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <Star weight="fill" className="h-8 w-8 text-primary" />
              <h1 className="text-title md:text-display">Your Watchlist</h1>
            </div>
            <p className="text-muted-foreground">
              {watchlistIds.length === 0 
                ? "You haven't added any markets to your watchlist yet" 
                : `Tracking ${watchlistIds.length} ${watchlistIds.length === 1 ? 'market' : 'markets'}`
              }
            </p>
          </motion.div>

          {/* Markets Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <MarketSkeleton key={i} />
              ))}
            </div>
          ) : watchlistedMarkets.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-subtitle font-semibold mb-2">No markets in watchlist</h3>
                <p className="text-small text-muted-foreground mb-4">
                  Start tracking markets by clicking the star icon on any market card.
                </p>
                <Button asChild>
                  <Link href="/markets">
                    Browse Markets
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {watchlistedMarkets.map((market, index) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onToggleWatch={() => handleToggleWatch(market)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Smart Suggestions */}
          {!isLoading && watchlistedMarkets.length > 0 && markets && (
            <SuggestionsPanel
              categories={watchedCategories}
              watchedIds={watchlistIds}
              allMarkets={markets}
              onAdd={handleAddSuggested}
            />
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
