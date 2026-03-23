"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  ArrowsCounterClockwise,
  Bell,
  Broadcast,
  CaretDown,
  Eye,
  TrendUpIcon,
  TrendDownIcon,
} from "@phosphor-icons/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/services/polymarket";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import { WhaleActivityFeed } from "@/components/WhaleActivityFeed";
import { useMarketIntelligence } from "@/services/ai";
import { Sparkle } from "@phosphor-icons/react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAlerts } from "@/hooks/useAlerts";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const MarketSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

const CollapsibleCard = ({
  title,
  children,
  defaultOpen = false,
  badge,
  actions,
}: CollapsibleCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={`flex flex-row items-center justify-between p-4 md:p-5 pb-3 ${
          isMobile ? "cursor-pointer" : ""
        }`}
        onClick={() => isMobile && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-subtitle">{title}</CardTitle>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {isMobile && (
            <motion.div
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <CaretDown weight="bold" className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      </CardHeader>
      {(!isMobile || isOpen) && (
        <motion.div
          initial={false}
          animate={{
            height: isOpen || !isMobile ? "auto" : 0,
            opacity: isOpen || !isMobile ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <CardContent className="p-4 md:p-5 pt-0">{children}</CardContent>
        </motion.div>
      )}
    </Card>
  );
};

interface MarketCardProps {
  market: {
    id: string;
    name: string;
    category: string;
    yesOdds: number;
    noOdds: number;
    volume: string;
    change24h: number;
  };
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

const SwipeableMarketCard = ({
  market,
  onSwipeRight,
  onSwipeLeft,
}: MarketCardProps) => {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["oklch(58% 0.22 25)", "oklch(0% 0 0 / 0)", "oklch(45% 0.15 145)"]
  );
  const rightOpacity = useTransform(x, [0, 100], [0, 1]);
  const leftOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    { offset }: { offset: { x: number; y: number } }
  ) => {
    if (offset.x > 100) {
      onSwipeRight();
      x.set(0);
    } else if (offset.x < -100) {
      onSwipeLeft();
      x.set(0);
    }
  };

  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{ background }}
      >
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-medium text-small"
          style={{ opacity: leftOpacity }}
        >
          Dismiss
        </motion.div>
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-medium text-small"
          style={{ opacity: rightOpacity }}
        >
          Add to Watchlist
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card"
      >
        <Link href={`/markets/${market.id}`}>
          <Card className="hover:bg-secondary/50 transition-base cursor-pointer border-0 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium leading-tight line-clamp-2 mb-2">
                    {market.name}
                  </p>
                  <Badge variant="secondary" className="text-caption">
                    {market.category}
                  </Badge>
                </div>
                <div
                  className={`text-small font-medium shrink-0 flex items-center gap-0.5 ${
                    market.change24h >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {market.change24h >= 0 ? (
                    <TrendUpIcon className="h-3 w-3" />
                  ) : (
                    <TrendDownIcon className="h-3 w-3" />
                  )}
                  {market.change24h >= 0 ? "+" : ""}
                  {market.change24h}%
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 text-center p-2 rounded bg-success/10">
                  <div className="text-small text-muted-foreground mb-0.5">YES</div>
                  <div className="text-body font-bold text-success">{market.yesOdds}¢</div>
                </div>
                <div className="flex-1 text-center p-2 rounded bg-destructive/10">
                  <div className="text-small text-muted-foreground mb-0.5">NO</div>
                  <div className="text-body font-bold text-destructive">{market.noOdds}¢</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 text-small text-muted-foreground">
                <span>24h Volume</span>
                <span className="font-medium">{market.volume}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </div>
  );
};

export default function DashboardPage() {
  const { data: markets, isLoading, error, refetch } = useMarkets({ limit: 20, active: true });
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user } = useAuth();

  const { stats, isLoading: statsLoading } = useDashboardStats(user?.id);
  const { alerts: userAlerts, isLoading: alertsLoading } = useAlerts(user?.id);

  // Last 5 alerts sorted by most recent activity
  const recentAlerts = useMemo(() => {
    return [...userAlerts]
      .sort((a, b) => {
        const aTime = a.last_triggered_at ?? a.created_at;
        const bTime = b.last_triggered_at ?? b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      })
      .slice(0, 5);
  }, [userAlerts]);

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
  });

  const liveMarkets = useMemo(
    () => (markets ? applyUpdatesToMarkets(markets) : []),
    [markets, applyUpdatesToMarkets]
  );

  const { data: intelligence, isLoading: intelligenceLoading } = useMarketIntelligence(
    liveMarkets.slice(0, 10)
  );

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
        <div className="container max-w-screen-2xl py-6 md:py-8 space-y-6 md:space-y-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-title md:text-display font-bold">
                {getGreeting()}, Trader
              </h1>
              <Badge variant="secondary" className="capitalize text-caption w-fit">
                Free
              </Badge>
            </div>
            <p className="text-small text-muted-foreground">
              Here&apos;s what&apos;s happening in your markets today.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          >
            {[
              {
                label: "Markets Watched",
                value: statsLoading ? "—" : String(stats.watchedCount),
                icon: Eye,
                href: "/watchlist",
              },
              {
                label: "Active Alerts",
                value: statsLoading ? "—" : String(stats.activeAlertCount),
                icon: Bell,
                href: "/alerts",
              },
              {
                label: "Triggered Today",
                value: statsLoading ? "—" : String(stats.triggeredTodayCount),
                icon: TrendUpIcon,
                href: "/alerts",
              },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                >
                  <Link href={stat.href}>
                    <Card className="hover:bg-secondary/50 transition-base cursor-pointer">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <Icon weight="duotone" className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                        <div className="text-title md:text-display font-bold truncate">
                          {statsLoading ? (
                            <Skeleton className="h-7 w-12" />
                          ) : (
                            stat.value
                          )}
                        </div>
                        <div className="text-small text-muted-foreground mt-1 truncate">{stat.label}</div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid gap-6 lg:gap-8 lg:grid-cols-3"
          >
            <div className="lg:col-span-2 min-w-0 overflow-hidden">
              <CollapsibleCard
                title="Trending Markets"
                badge={
                  isConnected && (
                    <Badge variant="secondary" className="text-caption gap-1 px-2 py-0.5">
                      <Broadcast weight="fill" className="h-2.5 w-2.5 text-success animate-pulse" />
                      Live
                    </Badge>
                  )
                }
                actions={
                  !isLoading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        refetch();
                      }}
                    >
                      <ArrowsCounterClockwise weight="bold" className="h-3.5 w-3.5" />
                    </Button>
                  )
                }
              >
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => <MarketSkeleton key={i} />)
                  ) : error ? (
                    <div className="p-6 text-center">
                      <p className="text-small text-muted-foreground mb-3">
                        Failed to load markets
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  ) : liveMarkets.length > 0 ? (
                    liveMarkets.map((market) => (
                      <div key={market.id} className="min-w-0">
                        <SwipeableMarketCard
                          market={{
                            id: market.id,
                            name: market.name,
                            category: market.category,
                            yesOdds: market.yesOdds,
                            noOdds: market.noOdds,
                            volume: market.volume24h || market.volume,
                            change24h: market.change24h,
                          }}
                          onSwipeRight={() => console.log("Watchlist:", market.id)}
                          onSwipeLeft={() => console.log("Dismissed:", market.id)}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground text-small">
                      No markets available
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" asChild className="w-full mt-4">
                  <Link href="/markets" className="text-primary">
                    View All Markets <ArrowRight weight="bold" className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CollapsibleCard>
            </div>

            <div className="space-y-6">
              <CollapsibleCard
                title="Recent Alerts"
                defaultOpen={true}
                actions={
                  <Button variant="ghost" size="sm" asChild className="h-8 px-3 hidden md:flex">
                    <Link href="/alerts" className="text-primary text-small">
                      View All
                    </Link>
                  </Button>
                }
              >
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {alertsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2 p-3 rounded-lg bg-secondary/50">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))
                  ) : recentAlerts.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-small text-muted-foreground mb-2">No alerts yet</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/alerts">Create your first alert</Link>
                      </Button>
                    </div>
                  ) : (
                    recentAlerts.map((alert) => {
                      const typeLabel =
                        alert.alert_type === "odds" ? "Odds Alert"
                        : alert.alert_type === "volume" ? "Volume Alert"
                        : alert.alert_type === "new" ? "New Market"
                        : "Alert";
                      const timeStr = alert.last_triggered_at
                        ? (() => {
                            const diff = Date.now() - new Date(alert.last_triggered_at).getTime();
                            const m = Math.floor(diff / 60_000);
                            if (m < 60) return `${m}m ago`;
                            const h = Math.floor(m / 60);
                            if (h < 24) return `${h}h ago`;
                            return `${Math.floor(h / 24)}d ago`;
                          })()
                        : "Never triggered";
                      return (
                        <motion.div
                          key={alert.id}
                          whileHover={{ scale: 1.01 }}
                          className="p-3 md:p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-base cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-caption px-2 py-0.5 ${
                                alert.status === "triggered" ? "text-success" : ""
                              }`}
                            >
                              {typeLabel}
                            </Badge>
                            <span className="text-small text-muted-foreground">{timeStr}</span>
                          </div>
                          <p className="text-body font-medium truncate">
                            {alert.market_name ?? alert.name}
                          </p>
                          <p className="text-small text-muted-foreground line-clamp-2 mt-1">
                            {alert.condition_text ?? alert.name}
                          </p>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <Button variant="ghost" size="sm" asChild className="w-full mt-4 md:hidden">
                  <Link href="/alerts" className="text-primary">
                    View All Alerts
                  </Link>
                </Button>
              </CollapsibleCard>

              <Card className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-4 md:p-5 pb-3">
                  <CardTitle className="text-subtitle">Arbitrage Opps</CardTitle>
                  <Badge className="text-caption">Pro</Badge>
                </CardHeader>
                <CardContent className="p-4 md:p-5 pt-0">
                  <div className="space-y-3 filter blur-sm">
                    <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                      <p className="text-body font-medium">Bitcoin &gt;$100k</p>
                      <p className="text-small text-success">8.3% profit potential</p>
                    </div>
                    <div className="p-3 md:p-4 rounded-lg bg-secondary/50">
                      <p className="text-body font-medium">ETH &gt;$4,000</p>
                      <p className="text-small text-success">5.2% profit potential</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                    <div className="text-center p-6">
                      <p className="text-body font-medium mb-3">
                        Upgrade to Pro to unlock
                      </p>
                      <Button size="sm" asChild>
                        <Link href="/pricing">View Plans</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Intelligence widget */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 p-4 md:p-5 pb-3">
                  <Sparkle className="h-4 w-4 text-primary" weight="fill" />
                  <CardTitle className="text-subtitle">Market Intelligence</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-5 pt-0">
                  {intelligenceLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      ))}
                    </div>
                  ) : intelligence && intelligence.length > 0 ? (
                    <div className="space-y-3">
                      {intelligence.slice(0, 3).map((item) => (
                        <div key={item.marketId} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-caption px-2 py-0.5 ${
                                item.signal === "bullish"
                                  ? "text-success"
                                  : item.signal === "bearish"
                                  ? "text-destructive"
                                  : ""
                              }`}
                            >
                              {item.signal}
                            </Badge>
                            <Badge variant="outline" className="text-caption px-2 py-0.5">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-small font-medium line-clamp-1">{item.marketName}</p>
                          <p className="text-caption text-muted-foreground line-clamp-2">{item.insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-muted-foreground">
                      Loading market intelligence…
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-5">
                  <WhaleActivityFeed limit={6} showHeader={true} />
                </CardContent>
              </Card>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
