"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@phosphor-icons/react";
import { useMarkets, type TransformedMarket } from "@/services/polymarket";
import { motion } from "framer-motion";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AppHeader } from "@/components/AppHeader";

// Local storage for watchlist
function getWatchlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem("polys-watchlist") || "[]");
  } catch {
    return [];
  }
}

function toggleWatchlist(marketId: string): string[] {
  const current = getWatchlist();
  const updated = current.includes(marketId)
    ? current.filter((id) => id !== marketId)
    : [...current, marketId];
  localStorage.setItem("polys-watchlist", JSON.stringify(updated));
  return updated;
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
          <div className="flex items-center justify-between text-caption text-muted-foreground mb-4">
            <span>Vol: {market.volume}</span>
            <span>Liq: {market.liquidity}</span>
          </div>

          {/* Action Button */}
          <Link href={`/markets/${market.id}`} className="block">
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

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<string[]>(() => getWatchlist());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });

  // Fetch markets
  const { data: markets, isLoading } = useMarkets({
    limit: 50,
    active: true,
  });

  // Filter markets to only show watchlisted ones
  const watchlistedMarkets = useMemo(() => {
    if (!markets) return [];
    return markets.filter((m) => watchlist.includes(m.id));
  }, [markets, watchlist]);

  const handleToggleWatch = (marketId: string, marketName: string) => {
    const updated = toggleWatchlist(marketId);
    const isAdded = updated.includes(marketId);
    setWatchlist(updated);
    
    // Show toast notification
    toast({
      title: isAdded ? "Added to watchlist" : "Removed from watchlist",
      description: isAdded ? `"${marketName}" has been added to your watchlist` : `"${marketName}" has been removed from your watchlist`,
    });
    
    // Dispatch storage event for cross-component sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'polys-watchlist',
        newValue: JSON.stringify(updated),
      }));
    }
  };

  // Listen for watchlist changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'polys-watchlist' && e.newValue) {
        try {
          setWatchlist(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Failed to parse watchlist from storage event', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading while checking auth
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
              {watchlist.length === 0 
                ? "You haven't added any markets to your watchlist yet" 
                : `Tracking ${watchlist.length} ${watchlist.length === 1 ? 'market' : 'markets'}`
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
                  onToggleWatch={() => handleToggleWatch(market.id, market.name)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
