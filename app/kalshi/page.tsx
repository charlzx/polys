"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  WarningCircle,
} from "@phosphor-icons/react";
import { AppHeader } from "@/components/AppHeader";
import { useKalshiMarkets } from "@/hooks/useKalshiMarkets";
import type { FlatKalshiMarket } from "@/services/kalshi";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 12;

// Map Kalshi raw category slugs to display-friendly labels (aligned with Polymarket style)
const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economics: "Economics",
  crypto: "Crypto",
  finance: "Finance",
  sports: "Sports",
  science: "Science",
  technology: "Technology",
  health: "Health",
  culture: "Culture",
  weather: "Weather",
  entertainment: "Entertainment",
  geopolitics: "Geopolitics",
  international: "International",
};

function labelFor(raw: string): string {
  if (!raw) return "Other";
  return CATEGORY_LABELS[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// Build a sorted, de-duped list of categories from the markets data
function buildCategories(markets: FlatKalshiMarket[]): string[] {
  const set = new Set<string>();
  for (const m of markets) {
    const label = labelFor(m.eventCategory);
    if (label) set.add(label);
  }
  return ["All", ...Array.from(set).sort()];
}

// External Kalshi market URL
function kalshiUrl(ticker: string): string {
  return `https://kalshi.com/markets/${ticker.split("-")[0].toLowerCase()}`;
}

// Format volume in dollars for display
function formatVolume(fp: number): string {
  if (fp <= 0) return "—";
  if (fp >= 1_000_000) return `$${(fp / 1_000_000).toFixed(1)}M`;
  if (fp >= 1_000) return `$${(fp / 1_000).toFixed(1)}K`;
  return `$${fp.toFixed(0)}`;
}

function KalshiMarketCard({ market, index }: { market: FlatKalshiMarket; index: number }) {
  const yesPercent = Math.round(market.yesMid * 100);
  const noPercent = 100 - yesPercent;
  const url = kalshiUrl(market.ticker);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Card className="group hover:border-primary/30 transition-base h-full flex flex-col">
        <CardContent className="p-4 flex flex-col flex-1">
          {/* Category badge */}
          <Badge variant="outline" className="text-caption mb-3 self-start">
            {labelFor(market.eventCategory)}
          </Badge>

          {/* Market title */}
          <h3 className="text-small font-medium mb-3 line-clamp-2 flex-1 min-h-[2.5rem]">
            {market.eventTitle || market.marketTitle}
          </h3>

          {/* YES / NO odds */}
          <div className="flex items-center gap-6 mb-3">
            <div>
              <div className="text-title font-bold text-success">{yesPercent}%</div>
              <div className="text-caption text-muted-foreground">YES</div>
            </div>
            <div>
              <div className="text-title font-bold text-destructive">{noPercent}%</div>
              <div className="text-caption text-muted-foreground">NO</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-small font-medium text-muted-foreground">
                {formatVolume(market.volumeFp)}
              </div>
              <div className="text-caption text-muted-foreground">Volume</div>
            </div>
          </div>

          {/* YES probability bar */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>

          {/* External trade link */}
          <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-auto">
            <Button
              variant="secondary"
              size="sm"
              className="w-full hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all cursor-pointer"
            >
              Trade on Kalshi
              <ArrowUpRight weight="bold" className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KalshiMarketSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-5 w-16 mb-3" />
        <Skeleton className="h-10 w-full mb-3" />
        <div className="flex gap-6 mb-3">
          <Skeleton className="h-12 w-16" />
          <Skeleton className="h-12 w-16" />
        </div>
        <Skeleton className="h-1.5 w-full mb-4" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function KalshiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("volume");
  const [currentPage, setCurrentPage] = useState(1);

  const { markets, isLoading, error, reload } = useKalshiMarkets({ limit: 200 });

  const categories = useMemo(() => buildCategories(markets), [markets]);

  const filteredMarkets = useMemo(() => {
    let result = [...markets];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.eventTitle.toLowerCase().includes(q) ||
          m.marketTitle.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "All") {
      result = result.filter(
        (m) => labelFor(m.eventCategory) === selectedCategory
      );
    }

    switch (sortBy) {
      case "volume":
        result.sort((a, b) => b.volumeFp - a.volumeFp);
        break;
      case "odds_yes":
        result.sort((a, b) => b.yesMid - a.yesMid);
        break;
      case "odds_no":
        result.sort((a, b) => a.yesMid - b.yesMid);
        break;
    }

    return result;
  }, [markets, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = filteredMarkets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0 min-h-screen">
        <div className="container py-8">
          <div className="space-y-6">

            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <h1 className="text-title md:text-display">Kalshi Markets</h1>
                {!isLoading && markets.length > 0 && (
                  <Badge variant="secondary" className="text-caption">
                    {markets.length} live
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                Browse live prediction markets from Kalshi — click any card to trade on Kalshi.com
              </p>
            </motion.div>

            {/* Filters */}
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
                  placeholder="Search Kalshi markets..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Category filter */}
              <Select
                value={selectedCategory}
                onValueChange={(v) => {
                  setSelectedCategory(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Highest Volume</SelectItem>
                  <SelectItem value="odds_yes">Highest YES Odds</SelectItem>
                  <SelectItem value="odds_no">Highest NO Odds</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Results count */}
            {!isLoading && !error && (
              <p className="text-small text-muted-foreground">
                Showing {paginatedMarkets.length} of {filteredMarkets.length} markets
              </p>
            )}

            {/* Content */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <KalshiMarketSkeleton key={i} />)}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <WarningCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={reload}>
                    Try Again
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
                      ? `No Kalshi markets match "${searchQuery}".`
                      : "No markets match your filters."}
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
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedMarkets.map((market, index) => (
                  <KalshiMarketCard key={market.ticker} market={market} index={index} />
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
  );
}
