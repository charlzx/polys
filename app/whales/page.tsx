"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { WhaleActivityFeed } from "@/components/WhaleActivityFeed";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useWhaleSummary } from "@/hooks/useWhales";
import { formatDollar } from "@/services/whales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  TrendUpIcon,
  TrendDownIcon,
  MagnifyingGlass,
  ArrowRight,
  Sparkle,
  Lightning,
  CurrencyDollar,
  Drop,
} from "@phosphor-icons/react";

const FREE_LIMIT = 5;

function formatChange(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function MarketSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function WhalesPage() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user } = useAuth();
  const isPro = user?.tier === "pro" || user?.tier === "premium";

  const { data, isLoading, isError } = useWhaleSummary(20);

  const displayMarkets = useMemo(() => {
    if (!data?.markets) return [];
    const visible = isPro ? data.markets : data.markets.slice(0, FREE_LIMIT);
    return visible;
  }, [data, isPro]);

  const hiddenCount = (data?.markets?.length ?? 0) - displayMarkets.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = search.trim();
    if (addr.length >= 10) {
      router.push(`/whales/${addr}`);
    }
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
        <div className="container max-w-screen-xl py-6 md:py-8 space-y-6">

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye weight="duotone" className="h-8 w-8 text-primary" />
              <h1 className="text-title md:text-display font-bold">Whale Tracker</h1>
            </div>
            <p className="text-muted-foreground text-small">
              Track large-volume market activity and monitor smart money movements on Polymarket.
            </p>
          </motion.div>

          {/* Summary Stats */}
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              <Card>
                <CardContent className="p-4">
                  <CurrencyDollar weight="duotone" className="h-5 w-5 text-muted-foreground mb-2" />
                  <div className="text-title font-bold">{formatDollar(data.totalVolume24h)}</div>
                  <div className="text-small text-muted-foreground">24h Volume</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Drop weight="duotone" className="h-5 w-5 text-muted-foreground mb-2" />
                  <div className="text-title font-bold">{formatDollar(data.totalLiquidity)}</div>
                  <div className="text-small text-muted-foreground">Total Liquidity</div>
                </CardContent>
              </Card>
              {data.largestMove && (
                <Card className="col-span-2 md:col-span-1">
                  <CardContent className="p-4">
                    <Lightning weight="duotone" className="h-5 w-5 text-muted-foreground mb-2" />
                    <div className={`text-title font-bold ${data.largestMove.change >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatChange(data.largestMove.change)}
                    </div>
                    <div className="text-caption text-muted-foreground line-clamp-1">
                      {data.largestMove.market}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Wallet Lookup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-small font-medium mb-3">Lookup a wallet address</p>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="0x... Polymarket wallet address"
                      className="pl-9"
                      aria-label="Wallet address"
                    />
                  </div>
                  <Button type="submit" disabled={search.trim().length < 10}>
                    Lookup
                    <ArrowRight weight="bold" className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Market Activity Table */}
            <div className="lg:col-span-2 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-subtitle font-semibold">Top Markets by Whale Volume</h2>
                  {!isPro && (
                    <Badge variant="secondary" className="text-caption gap-1">
                      <Sparkle weight="fill" className="h-3 w-3 text-primary" />
                      Pro unlocks all
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => <MarketSkeleton key={i} />)
                  ) : isError ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-small">
                        Failed to load whale data.
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {displayMarkets.map((market, index) => (
                        <motion.div
                          key={market.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * index }}
                        >
                          <Link href={`/markets/${market.id}`}>
                            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-caption text-muted-foreground font-mono">
                                        #{index + 1}
                                      </span>
                                      <Badge variant="outline" className="text-caption px-1.5 py-0">
                                        {market.category}
                                      </Badge>
                                    </div>
                                    <p className="text-small font-medium line-clamp-2">
                                      {market.name}
                                    </p>
                                  </div>
                                  <div className={`text-small font-semibold shrink-0 flex items-center gap-1 ${
                                    market.priceChange24h >= 0 ? "text-success" : "text-destructive"
                                  }`}>
                                    {market.priceChange24h >= 0 ? (
                                      <TrendUpIcon className="h-3.5 w-3.5" />
                                    ) : (
                                      <TrendDownIcon className="h-3.5 w-3.5" />
                                    )}
                                    {formatChange(market.priceChange24h)}
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded bg-success/10">
                                    <div className="text-caption text-muted-foreground mb-0.5">YES</div>
                                    <div className="text-small font-bold text-success">
                                      {market.yesPrice}¢
                                    </div>
                                  </div>
                                  <div className="p-2 rounded bg-destructive/10">
                                    <div className="text-caption text-muted-foreground mb-0.5">NO</div>
                                    <div className="text-small font-bold text-destructive">
                                      {market.noPrice}¢
                                    </div>
                                  </div>
                                  <div className="p-2 rounded bg-secondary/50">
                                    <div className="text-caption text-muted-foreground mb-0.5">Vol 24h</div>
                                    <div className="text-small font-bold">
                                      {formatDollar(market.volume24h)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}

                      {hiddenCount > 0 && (
                        <Card className="relative overflow-hidden">
                          <CardContent className="p-6">
                            <div className="filter blur-sm space-y-3 pointer-events-none">
                              {[...Array(Math.min(hiddenCount, 3))].map((_, i) => (
                                <div key={i} className="h-16 rounded bg-secondary/50" />
                              ))}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                              <div className="text-center p-4">
                                <Sparkle weight="fill" className="h-6 w-6 text-primary mx-auto mb-2" />
                                <p className="text-small font-medium mb-2">
                                  {hiddenCount} more markets hidden
                                </p>
                                <p className="text-caption text-muted-foreground mb-3">
                                  Upgrade to Pro to see all whale activity
                                </p>
                                <Button size="sm" asChild>
                                  <Link href="/pricing">View Plans</Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Activity Feed Sidebar */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Card>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-subtitle">Live Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <WhaleActivityFeed limit={12} showHeader={false} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
