"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  TrendUpIcon,
  TrendDownIcon,
  Eye,
  Star,
  ArrowRight,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useTrackedMarkets } from "@/hooks/useTrackedMarkets";
import { motion } from "framer-motion";

export default function PortfolioPage() {
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { watchlistItems, isLoading: watchlistLoading } = useWatchlist();
  const { trackedMarkets, isLoading: marketsLoading } = useTrackedMarkets(watchlistItems);

  const isLoading = watchlistLoading || marketsLoading;

  // Performance summary — only count markets where we have real 24h data
  const summary = useMemo(() => {
    const up = trackedMarkets.filter((m) => m.change24h > 0).length;
    const down = trackedMarkets.filter((m) => m.change24h < 0).length;
    return { up, down, total: trackedMarkets.length };
  }, [trackedMarkets]);

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
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0 min-h-screen">
        <div className="container max-w-screen-2xl py-6 md:py-8 space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-title md:text-display font-bold">Tracked Markets</h1>
              <p className="text-small text-muted-foreground mt-1">
                Your watchlisted markets and how they&apos;re moving
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/markets">
                <Eye className="h-4 w-4 mr-2" />
                Browse Markets
              </Link>
            </Button>
          </motion.div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-3 gap-4"
          >
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Star weight="duotone" className="h-5 w-5 text-muted-foreground" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mb-1" />
                ) : (
                  <div className="text-title md:text-display font-bold">{summary.total}</div>
                )}
                <div className="text-small text-muted-foreground">Markets Watched</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendUpIcon weight="duotone" className="h-5 w-5 text-success" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mb-1" />
                ) : (
                  <div className="text-title md:text-display font-bold text-success">{summary.up}</div>
                )}
                <div className="text-small text-muted-foreground">Up 24h</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendDownIcon weight="duotone" className="h-5 w-5 text-destructive" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mb-1" />
                ) : (
                  <div className="text-title md:text-display font-bold text-destructive">{summary.down}</div>
                )}
                <div className="text-small text-muted-foreground">Down 24h</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Market grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="p-4 md:p-5 pb-3">
                <CardTitle className="text-subtitle">
                  {isLoading ? "Loading…" : `${summary.total} Markets`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="divide-y divide-border">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-4 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    ))}
                  </div>
                ) : trackedMarkets.length === 0 ? (
                  <div className="p-10 text-center">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-subtitle font-semibold mb-2">No markets watched yet</h3>
                    <p className="text-small text-muted-foreground mb-4 max-w-sm mx-auto">
                      Star markets from the browse page to track them here and see how their odds move.
                    </p>
                    <Button asChild>
                      <Link href="/markets">
                        Browse Markets
                        <ArrowRight weight="bold" className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {trackedMarkets.map((market, index) => (
                      <motion.div
                        key={market.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <Link
                          href={`/markets/${market.id}`}
                          className="flex items-center gap-3 md:gap-4 p-4 hover:bg-secondary/50 transition-colors group"
                        >
                          {/* Category + name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="outline" className="text-caption shrink-0 px-1.5 py-0">
                                {market.category}
                              </Badge>
                              <span
                                className={`text-caption font-medium shrink-0 flex items-center gap-0.5 ${
                                  market.change24h > 0
                                    ? "text-success"
                                    : market.change24h < 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {market.change24h > 0 ? (
                                  <TrendUpIcon weight="bold" className="h-3 w-3" />
                                ) : market.change24h < 0 ? (
                                  <TrendDownIcon weight="bold" className="h-3 w-3" />
                                ) : null}
                                {market.change24h !== 0
                                  ? `${market.change24h > 0 ? "+" : ""}${market.change24h}%`
                                  : "—"}
                              </span>
                            </div>
                            <p className="text-small font-medium line-clamp-1 group-hover:text-primary transition-colors">
                              {market.name}
                            </p>
                            <p className="text-caption text-muted-foreground mt-0.5">
                              Vol {market.volume24h && market.volume24h !== "—" ? market.volume24h : market.volume}
                            </p>
                          </div>

                          {/* Odds */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-caption text-muted-foreground">YES / NO</div>
                              <div className="text-small font-mono font-semibold">
                                <span className="text-success">{market.yesOdds}¢</span>
                                {" / "}
                                <span className="text-destructive">{market.noOdds}¢</span>
                              </div>
                            </div>
                            {/* YES progress bar */}
                            <div className="w-20 hidden md:block">
                              <div className="flex justify-between text-caption text-muted-foreground mb-1">
                                <span>YES</span>
                                <span>{market.yesOdds}%</span>
                              </div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-300"
                                  style={{ width: `${market.yesOdds}%` }}
                                />
                              </div>
                            </div>
                            {/* Mobile: just YES odds */}
                            <div className="sm:hidden text-right">
                              <div className="text-body font-bold text-success">{market.yesOdds}¢</div>
                              <div className="text-caption text-muted-foreground">YES</div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
