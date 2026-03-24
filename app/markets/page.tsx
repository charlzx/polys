"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Newspaper,
} from "@phosphor-icons/react";
import { useUnifiedMarkets } from "@/hooks/useUnifiedMarkets";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { polymarketToUnified } from "@/services/unified";
import type { UnifiedMarket, MarketSource } from "@/services/unified";
import { useMarkets, MARKET_CATEGORIES, type MarketCategory } from "@/services/polymarket";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AppHeader } from "@/components/AppHeader";
import { PublicHeader } from "@/components/PublicHeader";
import { MobileNav } from "@/components/MobileNav";

const ITEMS_PER_PAGE = 12;

function SourceBadge({ source }: { source: MarketSource }) {
  if (source === "kalshi") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-500">
        Kalshi
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-500">
      Polymarket
    </Badge>
  );
}

function KalshiDetailDialog({ market, open, onClose }: { market: UnifiedMarket; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{market.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-caption">{market.category}</Badge>
            <SourceBadge source={market.source} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <div className="text-caption text-muted-foreground mb-1">YES</div>
              <div className="text-title font-bold text-success">{market.yesOdds}%</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-caption text-muted-foreground mb-1">NO</div>
              <div className="text-title font-bold text-destructive">{market.noOdds}%</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-small text-muted-foreground p-3 rounded-lg bg-secondary/50">
            <span>Volume</span>
            <span className="font-medium">{market.volume}</span>
          </div>
          {market.externalUrl && (
            <Button variant="secondary" size="sm" className="w-full" asChild>
              <a href={market.externalUrl} target="_blank" rel="noopener noreferrer">
                View on Kalshi
                <ArrowUpRight weight="bold" className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MarketCard({ market, isWatched, onToggleWatch, index }: {
  market: UnifiedMarket;
  isWatched: boolean;
  onToggleWatch: () => void;
  index: number;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isKalshi = market.source === "kalshi";

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="group hover:border-primary/30 transition-base relative overflow-hidden h-full flex flex-col">
        <div className="relative w-full h-28 bg-secondary/50">
          {market.image ? (
            <Image
              src={market.image}
              alt={market.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatch();
            }}
            className="absolute top-[7.5rem] right-4 text-muted-foreground hover:text-primary transition-base cursor-pointer"
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star weight={isWatched ? "fill" : "regular"} className={`h-4 w-4 ${isWatched ? "text-primary" : ""}`} />
          </button>

          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <Badge variant="outline" className="text-caption">{market.category}</Badge>
            <SourceBadge source={market.source} />
          </div>

          <h3 className="text-small font-medium mb-3 pr-6 line-clamp-2 min-h-[2.5rem]">{market.name}</h3>

          <div className="flex items-center gap-6 mb-3">
            <div>
              <div className="text-title font-bold text-success">{market.yesOdds}%</div>
              <div className="text-caption text-muted-foreground">YES</div>
            </div>
            <div>
              <div className="text-title font-bold text-destructive">{market.noOdds}%</div>
              <div className="text-caption text-muted-foreground">NO</div>
            </div>
            {market.change24h !== 0 && (
              <div className="ml-auto">
                <div className={`flex items-center text-small font-medium ${market.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                  {market.change24h >= 0 ? (
                    <TrendUpIcon weight="bold" className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendDownIcon weight="bold" className="h-3 w-3 mr-1" />
                  )}
                  {market.change24h >= 0 ? "+" : ""}{market.change24h}%
                </div>
                <div className="text-caption text-muted-foreground text-right">24h</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-caption text-muted-foreground mb-4">
            <span>Vol: {market.volume}</span>
            {market.liquidity !== "—" && <span>Liq: {market.liquidity}</span>}
          </div>

          <div className="mt-auto">
            <Button
              variant="secondary"
              size="sm"
              className="w-full hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all cursor-pointer"
            >
              View Details
              <ArrowUpRight weight="bold" className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <>
      {isKalshi ? (
        <div onClick={() => setDialogOpen(true)} className="cursor-pointer h-full">
          {inner}
        </div>
      ) : (
        <Link href={`/markets/${market.id}`} className="block h-full">
          {inner}
        </Link>
      )}
      {isKalshi && (
        <KalshiDetailDialog market={market} open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </>
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
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>("All");
  const [selectedSource, setSelectedSource] = useState<"all" | MarketSource>("all");
  const [sortBy, setSortBy] = useState("volume");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const source = searchParams.get("source");
    if (source === "kalshi" || source === "polymarket") {
      setSelectedSource(source as MarketSource);
    }
  }, [searchParams]);

  const { watchlistIds, toggleWatchlist, isWatched } = useWatchlist();

  const { data: unifiedMarkets, isLoading, error } = useUnifiedMarkets({ limit: 200 });

  const { data: polyMarkets } = useMarkets({ limit: 50, active: true });

  const tokenPairs = useMemo(
    () =>
      (polyMarkets ?? [])
        .filter((m) => m.yesTokenId)
        .map((m) => ({ marketId: m.id, yesTokenId: m.yesTokenId! })),
    [polyMarkets]
  );

  const { isConnected, applyUpdatesToMarkets } = useMarketWebSocket({
    tokenPairs,
    marketIds: polyMarkets?.map((m) => m.id) ?? [],
    enabled: (polyMarkets?.length ?? 0) > 0,
  });

  const livePolyMarkets = useMemo(
    () => (polyMarkets ? applyUpdatesToMarkets(polyMarkets) : []),
    [polyMarkets, applyUpdatesToMarkets]
  );

  const livePolyUnified = useMemo(
    () => livePolyMarkets.map(polymarketToUnified),
    [livePolyMarkets]
  );

  const mergedMarkets = useMemo<UnifiedMarket[]>(() => {
    const livePolyMap = new Map(livePolyUnified.map((m) => [m.id, m]));
    return unifiedMarkets.map((m) => livePolyMap.get(m.id) ?? m);
  }, [unifiedMarkets, livePolyUnified]);

  const filteredMarkets = useMemo(() => {
    let result = [...mergedMarkets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(query));
    }

    if (selectedCategory !== "All") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    if (selectedSource !== "all") {
      result = result.filter((m) => m.source === selectedSource);
    }

    switch (sortBy) {
      case "volume":
        result.sort((a, b) => b.volumeRaw - a.volumeRaw);
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
  }, [mergedMarkets, searchQuery, selectedCategory, selectedSource, sortBy]);

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleWatch = async (market: UnifiedMarket) => {
    const result = await toggleWatchlist(market.id, market.name, market.category);
    if (result === null) {
      toast({
        title: "Sign in to watch markets",
        description: "Create a free account to track markets in your watchlist.",
      });
      return;
    }
    toast({
      title: result ? "Added to watchlist" : "Removed from watchlist",
      description: result
        ? `"${market.name}" added to your watchlist`
        : `"${market.name}" removed from your watchlist`,
    });
  };

  return (
    <>
      {isAuthenticated ? (
        <AppHeader />
      ) : (
        <PublicHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMobileNavOpen={() => setMobileNavOpen(true)}
        />
      )}

      {!isAuthenticated && (
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      )}

      <div className="min-h-screen bg-background">
        <main className={isAuthenticated ? "pt-[120px] md:pt-[88px] pb-20 md:pb-0" : "pt-14"}>
          <div className="container py-8">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <h1 className="text-title md:text-display">Markets</h1>
                  {mergedMarkets.length > 0 && (
                    <Badge variant="secondary" className={`text-caption gap-1 ${isConnected ? "" : "text-warning"}`}>
                      <Broadcast className={`h-2.5 w-2.5 ${isConnected ? "text-success animate-pulse" : "text-warning"}`} />
                      {isConnected ? "Live" : "Reconnecting"}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  Browse and track prediction markets from Polymarket and Kalshi
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-4 flex-wrap"
              >
                <div className="relative flex-1 min-w-[200px]">
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

                <Select
                  value={selectedSource}
                  onValueChange={(v: string) => {
                    setSelectedSource(v as "all" | MarketSource);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="polymarket">Polymarket</SelectItem>
                    <SelectItem value="kalshi">Kalshi</SelectItem>
                  </SelectContent>
                </Select>

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
                        setSelectedSource("all");
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
                  {paginatedMarkets.map((market) => {
                    const isKalshi = market.source === "kalshi";
                    const rowContent = (
                      <div className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-secondary/70 shrink-0 hidden sm:block">
                          {market.image ? (
                            <Image
                              src={market.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Newspaper className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-caption">
                              {market.category}
                            </Badge>
                            <SourceBadge source={market.source} />
                            {market.change24h !== 0 && (
                              <span className={`text-caption font-medium ${market.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                                {market.change24h >= 0 ? "+" : ""}{market.change24h}%
                              </span>
                            )}
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
                              e.stopPropagation();
                              handleToggleWatch(market);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Star weight={isWatched(market.id) ? "fill" : "regular"} className={`h-4 w-4 ${isWatched(market.id) ? "text-primary" : ""}`} />
                          </button>
                        </div>
                      </div>
                    );

                    if (isKalshi) {
                      return (
                        <KalshiListRow key={market.id} market={market} isWatched={isWatched(market.id)} onToggleWatch={() => handleToggleWatch(market)} />
                      );
                    }

                    return (
                      <Link
                        key={market.id}
                        href={`/markets/${market.id}`}
                        className="block"
                      >
                        {rowContent}
                      </Link>
                    );
                  })}
                </div>
              )}

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

function KalshiListRow({ market, isWatched, onToggleWatch }: { market: UnifiedMarket; isWatched: boolean; onToggleWatch: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <div
        className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
        onClick={() => setDialogOpen(true)}
      >
        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-secondary/70 shrink-0 hidden sm:block">
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-caption">{market.category}</Badge>
            <SourceBadge source={market.source} />
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
            onClick={(e) => { e.stopPropagation(); onToggleWatch(); }}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Star weight={isWatched ? "fill" : "regular"} className={`h-4 w-4 ${isWatched ? "text-primary" : ""}`} />
          </button>
        </div>
      </div>
      <KalshiDetailDialog market={market} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
