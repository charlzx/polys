"use client";

import { useState, use, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  ShareNetwork,
  Bell,
  TrendUpIcon,
  TrendDownIcon,
  CaretLeft,
  ArrowSquareOut,
  Clock,
  Coins,
  Sparkle,
  Broadcast,
  ChartBar,
  ChartLine,
} from "@phosphor-icons/react";
import { useMarket, usePriceHistory, useOrderbook } from "@/services/polymarket";
import { useMarketSummary, type MarketSummary } from "@/services/ai";
import { useSingleMarketWebSocket } from "@/hooks/useMarketWebSocket";
import type { LiveTrade } from "@/hooks/useMarketWebSocket";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { AppHeader } from "@/components/AppHeader";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Volatility indicator component
function VolatilityIndicator({ level, momentum }: { level: 'low' | 'medium' | 'high'; momentum: 'bullish' | 'bearish' | 'neutral' }) {
  const colors = {
    low: 'bg-success/20 text-success',
    medium: 'bg-warning/20 text-warning',
    high: 'bg-destructive/20 text-destructive',
  };
  
  const momentumIcons = {
    bullish: <TrendUpIcon className="h-3 w-3" />,
    bearish: <TrendDownIcon className="h-3 w-3" />,
    neutral: <ChartLine className="h-3 w-3" />,
  };
  
  return (
    <div className="flex gap-2">
      <Badge variant="secondary" className={`text-caption gap-1 ${colors[level]}`}>
        <ChartLine className="h-3 w-3" />
        {level.charAt(0).toUpperCase() + level.slice(1)} Vol
      </Badge>
      <Badge variant="secondary" className="text-caption gap-1">
        {momentumIcons[momentum]}
        {momentum.charAt(0).toUpperCase() + momentum.slice(1)}
      </Badge>
    </div>
  );
}

// Order book depth visualization
function OrderBookChart({ bids, asks, maxTotal }: { 
  bids: { price: number; size: number; total: number }[];
  asks: { price: number; size: number; total: number }[];
  maxTotal: number;
}) {
  const safeMax = maxTotal > 0 ? maxTotal : 1; // avoid division-by-zero
  const depthData = [
    ...bids.map(b => ({ price: b.price, bidDepth: b.total, askDepth: 0 })).reverse(),
    ...asks.map(a => ({ price: a.price, bidDepth: 0, askDepth: a.total })),
  ];

  return (
    <div className="space-y-4">
      {/* Depth Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={depthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(45% 0.15 145)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="oklch(45% 0.15 145)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(58% 0.22 25)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="oklch(58% 0.22 25)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="price" 
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fill: "currentColor", fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={[0, safeMax * 1.1]} />
            <Area type="stepAfter" dataKey="bidDepth" stroke="oklch(45% 0.15 145)" fill="url(#bidGradient)" />
            <Area type="stepAfter" dataKey="askDepth" stroke="oklch(58% 0.22 25)" fill="url(#askGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Order Book Table */}
      <div className="grid grid-cols-2 gap-2 text-caption">
        {/* Bids */}
        <div>
          <div className="flex justify-between text-muted-foreground mb-1 px-2">
            <span>Price</span>
            <span>Size</span>
          </div>
          {bids.slice(0, 5).map((bid, i) => (
            <div key={i} className="flex justify-between px-2 py-0.5 relative">
              <div 
                className="absolute inset-y-0 right-0 bg-success/10" 
                style={{ width: `${(bid.total / safeMax) * 100}%` }} 
              />
              <span className="text-success relative z-10">{bid.price.toFixed(2)}</span>
              <span className="relative z-10 font-mono">{bid.size.toLocaleString()}</span>
            </div>
          ))}
        </div>
        
        {/* Asks */}
        <div>
          <div className="flex justify-between text-muted-foreground mb-1 px-2">
            <span>Price</span>
            <span>Size</span>
          </div>
          {asks.slice(-5).reverse().map((ask, i) => (
            <div key={i} className="flex justify-between px-2 py-0.5 relative">
              <div 
                className="absolute inset-y-0 left-0 bg-destructive/10" 
                style={{ width: `${(ask.total / safeMax) * 100}%` }} 
              />
              <span className="text-destructive relative z-10">{ask.price.toFixed(2)}</span>
              <span className="relative z-10 font-mono">{ask.size.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI Analysis collapsible panel
function AiAnalysisPanel({
  isLoading,
  summary,
  error,
}: {
  isLoading: boolean;
  summary: MarketSummary | null;
  error: string | null;
}) {
  const [open, setOpen] = useState(true);

  const sentimentColor: Record<string, string> = {
    "Bullish": "text-success",
    "Highly Bullish": "text-success",
    "Bearish": "text-destructive",
    "Highly Bearish": "text-destructive",
    "Neutral": "text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between pb-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-primary" weight="fill" />
          <CardTitle className="text-subtitle">AI Analysis</CardTitle>
        </div>
        <ChartLine
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : error ? (
            <p className="text-small text-muted-foreground">AI analysis unavailable.</p>
          ) : summary ? (
            <>
              <div>
                <div className="text-caption text-muted-foreground mb-1">Sentiment</div>
                <div className={`text-small font-semibold ${sentimentColor[summary.sentiment] ?? ""}`}>
                  {summary.sentiment}
                </div>
              </div>
              <div>
                <div className="text-caption text-muted-foreground mb-1">Price Movement</div>
                <p className="text-small">{summary.priceMovementInsight}</p>
              </div>
              <div>
                <div className="text-caption text-muted-foreground mb-1">Risk Factors</div>
                <ul className="space-y-1">
                  {summary.riskFactors.map((r, i) => (
                    <li key={i} className="text-small text-muted-foreground flex gap-2">
                      <span className="text-destructive mt-0.5">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-caption text-muted-foreground mb-1">Calibrated Assessment</div>
                <p className="text-small">{summary.probabilityAssessment}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

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

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: market, isLoading, error } = useMarket(id);
  const [timeframe, setTimeframe] = useState("30D");
  const [isWatched, setIsWatched] = useState(() => getWatchlist().includes(id));
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });

  // Live WebSocket data (real CLOB connection when yesTokenId available)
  const { currentOdds, lastUpdate, volatility, momentum, liveOrderBook, liveTrades, feedError } = useSingleMarketWebSocket(
    id,
    market?.yesOdds,
    market?.yesTokenId
  );

  // Periodic tick to re-evaluate staleness even when no other state changes occur
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!market?.yesTokenId) return;
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, [market?.yesTokenId]);

  // Stale data: if no WS update in 60s, data may be stale
  const isLiveDataStale = market?.yesTokenId
    ? lastUpdate === null || Date.now() - lastUpdate > 60_000
    : false;

  // Prefer live WebSocket odds; fall back to query data
  const displayYesOdds = currentOdds?.yes ?? market?.yesOdds ?? 50;
  const displayNoOdds = currentOdds?.no ?? market?.noOdds ?? 50;

  // Fetch real price history from CLOB API
  const { data: realHistory } = usePriceHistory(market?.yesTokenId, timeframe);

  // AI market summary
  const { data: aiSummary, isLoading: aiLoading, error: aiError } = useMarketSummary(market?.id);

  // Fetch real order book from CLOB REST API; prefer live WebSocket snapshot
  const { data: restOrderBook } = useOrderbook(market?.yesTokenId);
  const orderBook = liveOrderBook ?? restOrderBook ?? { bids: [], asks: [], maxTotal: 0 };

  // Price history: use real CLOB data or show empty (no random fallback)
  const chartData = useMemo(() => {
    if (!market) return [];
    return realHistory && realHistory.length > 0 ? realHistory : [];
  }, [market, realHistory]);

  // Show loading while checking auth
  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0">
        <div className="container py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
        </main>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0">
        <div className="container py-16 text-center">
          <h1 className="text-title mb-4">Market Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This market doesn&apos;t exist or is no longer available.
          </p>
          <Button asChild>
            <Link href="/markets">Browse Markets</Link>
          </Button>
        </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0">
      <div className="container py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-small text-muted-foreground">
          <Link href="/markets" className="hover:text-foreground transition-base flex items-center gap-1">
            <CaretLeft className="h-4 w-4" weight="bold" />
            Markets
          </Link>
          <span>/</span>
          <span>{market.category}</span>
        </div>

        {/* Market Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{market.category}</Badge>
              <Badge variant="secondary" className="text-success border-success/30">
                <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                Active
              </Badge>
              {feedError || isLiveDataStale ? (
                <Badge variant="secondary" className="text-caption gap-1 text-warning" title={feedError ?? "Live feed stale"}>
                  <Broadcast className="h-2.5 w-2.5 text-warning" />
                  Reconnecting
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-caption gap-1">
                  <Broadcast className="h-2.5 w-2.5 text-success animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <h1 className="text-title md:text-display font-bold mb-2">{market.name}</h1>
            {market.description && (
              <p className="text-muted-foreground max-w-2xl line-clamp-2">{market.description}</p>
            )}
            <div className="mt-3">
              <VolatilityIndicator level={volatility} momentum={momentum} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toggleWatchlist(id);
                setIsWatched(!isWatched);
                // Dispatch storage event for cross-component sync
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new StorageEvent('storage', {
                    key: 'polys-watchlist',
                    newValue: JSON.stringify(getWatchlist()),
                  }));
                }
              }}
            >
              <Star className={`h-4 w-4 mr-2 ${isWatched ? "fill-primary text-primary" : ""}`} weight={isWatched ? "fill" : "regular"} />
              {isWatched ? "Watching" : "Watch"}
            </Button>
            <Button variant="outline" size="sm">
              <ShareNetwork className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Current Odds Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="flex items-center gap-8">
                    <div>
                      <div className="text-display font-bold text-success">
                        {displayYesOdds}%
                      </div>
                      <div className="text-small text-muted-foreground">YES</div>
                    </div>
                    <div>
                      <div className="text-display font-bold text-destructive">
                        {displayNoOdds}%
                      </div>
                      <div className="text-small text-muted-foreground">NO</div>
                    </div>
                    <div className="pl-4 border-l border-border">
                      <div className={`flex items-center text-subtitle font-semibold ${
                        market.change24h >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {market.change24h >= 0 ? (
                          <TrendUpIcon className="h-5 w-5 mr-1" />
                        ) : (
                          <TrendDownIcon className="h-5 w-5 mr-1" />
                        )}
                        {market.change24h >= 0 ? "+" : ""}{market.change24h}%
                      </div>
                      <div className="text-small text-muted-foreground">24h change</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button>
                      <Bell className="h-4 w-4 mr-2" />
                      Create Alert
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`https://polymarket.com/event/${market.slug || market.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Trade
                        <ArrowSquareOut className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Chart with Volume */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-subtitle">Odds History</CardTitle>
                <div className="flex gap-1">
                  {["24H", "7D", "30D", "3M", "ALL"].map((tf) => (
                    <Button
                      key={tf}
                      variant={timeframe === tf ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setTimeframe(tf)}
                      className="px-3 h-8"
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <ChartLine className="h-8 w-8 opacity-30" />
                    <p className="text-small">No price history available for this timeframe.</p>
                    <p className="text-caption opacity-60">Price history is fetched from Polymarket CLOB.</p>
                  </div>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(45% 0.15 145)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="oklch(45% 0.15 145)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "currentColor", fontSize: 11 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "currentColor", fontSize: 11 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const data = payload[0]?.payload;
                              return (
                                <div className="bg-popover border border-border rounded-md p-3 shadow-lg">
                                  <div className="text-small font-medium mb-1">{label}</div>
                                  <div className="text-caption text-success">YES: {data?.yes}%</div>
                                  <div className="text-caption text-destructive">NO: {data?.no}%</div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="yes"
                            stroke="oklch(45% 0.15 145)"
                            strokeWidth={2}
                            fill="url(#yesGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs: Details, Activity, Order Book */}
            <Tabs defaultValue="orderbook">
              <TabsList>
                <TabsTrigger value="orderbook">Order Book</TabsTrigger>
                <TabsTrigger value="activity">Recent Trades</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="orderbook" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-subtitle">Market Depth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderBookChart 
                      bids={orderBook.bids} 
                      asks={orderBook.asks} 
                      maxTotal={orderBook.maxTotal} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {liveTrades.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Broadcast className="h-8 w-8 mx-auto mb-3 opacity-40 animate-pulse" />
                        <p className="text-small font-medium">Listening for order book changes&hellip;</p>
                        <p className="text-caption mt-1 opacity-70">Live trade events will appear here as they occur.</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="overflow-x-auto">
                          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none md:hidden z-10" />
                          <table className="w-full min-w-[500px]">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-caption font-medium text-muted-foreground text-left p-3">Time</th>
                                <th className="text-caption font-medium text-muted-foreground text-left p-3">Side</th>
                                <th className="text-caption font-medium text-muted-foreground text-right p-3">Price</th>
                                <th className="text-caption font-medium text-muted-foreground text-right p-3">Qty (USDC)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {liveTrades.map((trade: LiveTrade) => (
                                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/50 transition-base">
                                  <td className="text-small p-3 font-mono">
                                    {new Date(trade.timestamp).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </td>
                                  <td className={`text-small p-3 font-medium ${trade.side === "buy" ? "text-success" : "text-destructive"}`}>
                                    {trade.side === "buy" ? "Buy YES" : "Sell YES"}
                                  </td>
                                  <td className="text-small p-3 text-right font-mono">
                                    {(trade.price * 100).toFixed(1)}¢
                                  </td>
                                  <td className="text-small p-3 text-right font-mono">
                                    ${trade.size.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h4 className="text-small font-semibold mb-1">Resolution Criteria</h4>
                      <p className="text-small text-muted-foreground">
                        {market.description || `This market resolves based on the outcome of: ${market.name}`}
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-small font-semibold mb-1">Resolution Date</h4>
                        <p className="text-small text-muted-foreground">
                          {market.endDate
                            ? new Date(market.endDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "TBD"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-small font-semibold mb-1">Source</h4>
                        <p className="text-small text-muted-foreground">Polymarket</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-subtitle">Market Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span className="text-small">Total Volume</span>
                  </div>
                  <span className="text-small font-semibold">{market.volume}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendUpIcon className="h-4 w-4" />
                    <span className="text-small">24h Volume</span>
                  </div>
                  <span className="text-small font-semibold">{market.volume24h || market.volume}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ChartBar className="h-4 w-4" />
                    <span className="text-small">Liquidity</span>
                  </div>
                  <span className="text-small font-semibold">{market.liquidity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-small">End Date</span>
                  </div>
                  <span className="text-small font-semibold">
                    {market.endDate
                      ? new Date(market.endDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis panel */}
            <AiAnalysisPanel
              isLoading={aiLoading}
              summary={aiSummary ?? null}
              error={aiError ? String(aiError) : null}
            />
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
