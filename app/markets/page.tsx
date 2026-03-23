"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  TrendUpIcon,
  TrendDownIcon,
  Star,
  SquaresFour,
  List,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  Broadcast,
} from "@phosphor-icons/react";
import { useMarkets, MARKET_CATEGORIES, type MarketCategory, type TransformedMarket } from "@/services/polymarket";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AppHeader } from "@/components/AppHeader";
import { PublicHeader } from "@/components/PublicHeader";
import { MobileNav } from "@/components/MobileNav";

const ITEMS_PER_PAGE = 12;

function MarketCard({ market, isWatched, onToggleWatch, index }: { 
  market: TransformedMarket; 
  isWatched: boolean;
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
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-base cursor-pointer"
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star weight={isWatched ? "fill" : "regular"} className={`h-4 w-4 ${isWatched ? "text-primary" : ""}`} />
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

export default function MarketsPage() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>("All");
  const [sortBy, setSortBy] = useState("volume");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();

  const { watchlistIds, toggleWatchlist, isWatched } = useWatchlist();

  // Fetch markets
  const { data: markets, isLoading, error } = useMarkets({
    limit: 50,
    active: true,
  });

  // Build token pairs for real CLOB WebSocket updates
  const tokenPairs = useMemo(
    () =>
      (markets ?? [])
        .filter((m) => m.yesTokenId)
        .map((m) => ({ marketId: m.id, yesTokenId: m.yesTokenId! })),
    [markets]
  );

  const { isConnected, applyUpdatesToMarkets } = useMarketWebSocket({
    tokenPairs,
    marketIds: markets?.map((m) => m.id) ?? [],
    enabled: (markets?.length ?? 0) > 0,
  });

  // Apply live WebSocket updates to market data
  const liveMarkets = useMemo(
    () => (markets ? applyUpdatesToMarkets(markets) : []),
    [markets, applyUpdatesToMarkets]
  );

  // Filter and sort markets (using live WebSocket-updated prices where available)
  const filteredMarkets = useMemo(() => {
    if (!liveMarkets.length && !markets) return [];

    let result = [...liveMarkets];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(query));
    }

    // Filter by category
    if (selectedCategory !== "All") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "volume":
        break;
      case "newest":
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "change":
        result.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
        break;
      case "odds":
        result.sort((a, b) => Math.max(b.yesOdds, b.noOdds) - Math.max(a.yesOdds, a.noOdds));
        break;
    }

    return result;
  }, [liveMarkets, searchQuery, selectedCategory, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleWatch = async (market: TransformedMarket) => {
    const added = await toggleWatchlist(market.id, market.name, market.category);
    toast({
      title: added ? "Added to watchlist" : "Removed from watchlist",
      description: added
        ? `"${market.name}" added to your watchlist`
        : `"${market.name}" removed from your watchlist`,
    });
  };

  return (
    <>
      {/* Conditional Header based on auth */}
      {isAuthenticated ? (
        <AppHeader />
      ) : (
        <PublicHeader 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          onMobileNavOpen={() => setMobileNavOpen(true)}
        />
      )}

      {/* Mobile Nav for public view */}
      {!isAuthenticated && (
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      )}

      <div className="min-h-screen bg-background">
        <main className={isAuthenticated ? "pt-[120px] md:pt-[88px] pb-20 md:pb-0" : "pt-14"}>
          <div className="container py-8">
            <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <h1 className="text-title md:text-display">Markets</h1>
              {markets && (
                <Badge variant="secondary" className={`text-caption gap-1 ${isConnected ? "" : "text-warning"}`}>
                  <Broadcast className={`h-2.5 w-2.5 ${isConnected ? "text-success animate-pulse" : "text-warning"}`} />
                  {isConnected ? "Live" : "Reconnecting"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Browse and track prediction markets from Polymarket
            </p>
          </motion.div>

          {/* Filters Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={(v: string) => {
                setSelectedCategory(v as MarketCategory);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_CATEGORIES.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volume">Highest Volume</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="change">Largest Movement</SelectItem>
                <SelectItem value="odds">Most Decisive</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border border-border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <SquaresFour weight="regular" className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List weight="regular" className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-small text-muted-foreground">
            <span>
              Showing {paginatedMarkets.length} of {filteredMarkets.length} markets
            </span>
            {watchlistIds.length > 0 && (
              <Link href="/watchlist" className="text-primary hover:underline flex items-center gap-1.5">
                <Star weight="fill" className="h-4 w-4" />
                Watchlist ({watchlistIds.length})
              </Link>
            )}
          </div>

          {/* Markets Grid/List */}
          {isLoading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
              {[...Array(8)].map((_, i) => (
                <MarketSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Failed to load markets. Please try again.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : paginatedMarkets.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MagnifyingGlass className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-subtitle font-semibold mb-2">No markets found</h3>
                <p className="text-small text-muted-foreground mb-4">
                  {searchQuery
                    ? `No markets match "${searchQuery}". Try adjusting your search.`
                    : "No markets match your selected filters. Try changing your criteria."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedMarkets.map((market, index) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isWatched={isWatched(market.id)}
                  onToggleWatch={() => handleToggleWatch(market)}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
              {paginatedMarkets.map((market) => (
                <Link
                  key={market.id}
                  href={`/markets/${market.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-caption">
                        {market.category}
                      </Badge>
                      <span
                        className={`text-caption font-medium ${
                          market.change24h >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {market.change24h >= 0 ? "+" : ""}{market.change24h}%
                      </span>
                    </div>
                    <p className="text-small font-medium line-clamp-1">{market.name}</p>
                    <p className="text-caption text-muted-foreground">Vol: {market.volume}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-body font-bold text-success">{market.yesOdds}%</div>
                      <div className="text-caption text-muted-foreground">YES</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-body font-bold text-destructive">{market.noOdds}%</div>
                      <div className="text-caption text-muted-foreground">NO</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleWatch(market);
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Star weight={isWatched(market.id) ? "fill" : "regular"} className={`h-4 w-4 ${isWatched(market.id) ? "text-primary" : ""}`} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CaretLeft weight="bold" className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                      className="w-9 h-9"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CaretRight weight="bold" className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
    </div>
    </>
  );
}
