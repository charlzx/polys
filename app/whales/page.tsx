"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { WhaleActivityFeed } from "@/components/WhaleActivityFeed";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useWhalesLeaderboard } from "@/hooks/useWhales";
import { formatDollar, shortAddress } from "@/services/whales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  MagnifyingGlass,
  ArrowRight,
  Sparkle,
  TrendUpIcon,
  TrendDownIcon,
  ChartBar,
  ArrowUpRight,
} from "@phosphor-icons/react";

const FREE_LIMIT = 5;

function relativeTime(ts: string | null): string {
  if (!ts) return "—";
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function WhaleSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentTrade {
  title: string;
  side: string;
  outcome: string;
  amount: number;
  timestamp: string;
}

interface WhaleEntry {
  address: string;
  portfolioValue: number;
  totalVolume: number;
  winRate: number;
  openPositions: number;
  recentTrades: number;
  recentTradesList: RecentTrade[];
  lastActive: string | null;
  hasData: boolean;
}

function WhaleCard({ whale, rank }: { whale: WhaleEntry; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
    >
      <Link href={`/whales/${whale.address}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
          <CardContent className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-caption text-muted-foreground font-mono shrink-0">
                  #{rank}
                </span>
                <span className="text-small font-mono font-medium truncate">
                  {shortAddress(whale.address)}
                </span>
                {!whale.hasData && (
                  <Badge variant="outline" className="text-caption px-1.5 py-0 shrink-0">
                    No data
                  </Badge>
                )}
              </div>
              <ArrowUpRight
                weight="bold"
                className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
              />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="p-2 rounded bg-secondary/50 text-center">
                <div className="text-caption text-muted-foreground mb-0.5">Portfolio</div>
                <div className="text-small font-bold">
                  {whale.portfolioValue > 0 ? formatDollar(whale.portfolioValue) : "—"}
                </div>
              </div>
              <div className="p-2 rounded bg-secondary/50 text-center">
                <div className="text-caption text-muted-foreground mb-0.5">30d Volume</div>
                <div className="text-small font-bold">
                  {whale.totalVolume > 0 ? formatDollar(whale.totalVolume) : "—"}
                </div>
              </div>
              <div className="p-2 rounded bg-secondary/50 text-center">
                <div className="text-caption text-muted-foreground mb-0.5">Win Rate</div>
                <div className={`text-small font-bold flex items-center justify-center gap-0.5 ${
                  whale.winRate >= 50 ? "text-success" : whale.winRate > 0 ? "text-destructive" : ""
                }`}>
                  {whale.winRate > 0 ? (
                    <>
                      {whale.winRate >= 50 ? <TrendUpIcon className="h-3 w-3" /> : <TrendDownIcon className="h-3 w-3" />}
                      {whale.winRate}%
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="p-2 rounded bg-secondary/50 text-center">
                <div className="text-caption text-muted-foreground mb-0.5">Open Pos.</div>
                <div className="text-small font-bold">
                  {whale.openPositions > 0 ? whale.openPositions : "—"}
                </div>
              </div>
            </div>

            {/* Recent trade snippets */}
            {whale.recentTradesList && whale.recentTradesList.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-caption text-muted-foreground font-medium mb-1">Recent trades</div>
                {whale.recentTradesList.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-caption">
                    <span className={`font-semibold shrink-0 ${t.side === "BUY" ? "text-success" : "text-destructive"}`}>
                      {t.side}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{t.outcome}</Badge>
                    <span className="truncate text-muted-foreground">{t.title}</span>
                    <span className="shrink-0 font-medium">{formatDollar(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 text-caption text-muted-foreground">
              <span>{whale.recentTrades > 0 ? `${whale.recentTrades} total trades` : "No trades"}</span>
              <span>Last active: {relativeTime(whale.lastActive)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function WhalesPage() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user } = useAuth();
  const isPro = user?.tier === "pro" || user?.tier === "premium";

  const { data, isLoading, isError } = useWhalesLeaderboard(10);

  const allWhales = data?.whales ?? [];
  const displayWhales = isPro ? allWhales : allWhales.slice(0, FREE_LIMIT);
  const hiddenCount = allWhales.length - displayWhales.length;

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
              Monitor large Polymarket wallets — see their positions, trade history, and recent activity.
            </p>
          </motion.div>

          {/* Wallet Lookup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 md:p-5">
                <p className="text-small font-medium mb-3">Look up any Polymarket wallet</p>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="0x... Polymarket proxy wallet address"
                      className="pl-9 font-mono text-small"
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
            {/* Whale Leaderboard */}
            <div className="lg:col-span-2 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChartBar weight="duotone" className="h-5 w-5 text-primary" />
                    <h2 className="text-subtitle font-semibold">Top Tracked Wallets</h2>
                  </div>
                  {!isPro && (
                    <Badge variant="secondary" className="text-caption gap-1">
                      <Sparkle weight="fill" className="h-3 w-3 text-primary" />
                      Pro: full list
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => <WhaleSkeleton key={i} />)
                  ) : isError ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-small">
                        Failed to load whale data. Try again later.
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {displayWhales.map((whale, index) => (
                        <WhaleCard key={whale.address} whale={whale} rank={index + 1} />
                      ))}

                      {hiddenCount > 0 && (
                        <Card className="relative overflow-hidden">
                          <CardContent className="p-6">
                            <div className="filter blur-sm space-y-3 pointer-events-none">
                              {[...Array(Math.min(hiddenCount, 3))].map((_, i) => (
                                <div key={i} className="h-20 rounded bg-secondary/50" />
                              ))}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                              <div className="text-center p-4">
                                <Sparkle weight="fill" className="h-6 w-6 text-primary mx-auto mb-2" />
                                <p className="text-small font-medium mb-2">
                                  {hiddenCount} more wallets hidden
                                </p>
                                <p className="text-caption text-muted-foreground mb-3">
                                  Upgrade to Pro for the full leaderboard
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
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-subtitle">Large Trades (&gt;$1k)</CardTitle>
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
