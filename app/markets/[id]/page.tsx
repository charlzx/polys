"use client";

import { useState, use, useMemo } from "react";
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
import { useMarket, usePriceHistory } from "@/services/polymarket";
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
  BarChart,
  Bar,
  Cell,
} from "recharts";

// Generate realistic historical data with trend patterns
function generateHistoricalData(currentYes: number, days: number) {
  const data = [];
  const now = new Date();
  
  let yes = currentYes + (Math.random() - 0.5) * 30;
  yes = Math.max(10, Math.min(90, yes));
  
  const trendStrength = (currentYes - yes) / days;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const trend = trendStrength;
    const noise = (Math.random() - 0.5) * 4;
    const meanReversion = (50 - yes) * 0.02;
    
    yes += trend + noise + meanReversion;
    yes = Math.max(5, Math.min(95, yes));
    
    const dayVolatility = 2 + Math.random() * 3;
    const high = Math.min(95, yes + dayVolatility);
    const low = Math.max(5, yes - dayVolatility);
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      yes: Math.round(yes * 10) / 10,
      no: Math.round((100 - yes) * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      volume: Math.floor(50000 + Math.random() * 200000),
    });
  }

  if (data.length > 0) {
    data[data.length - 1].yes = currentYes;
    data[data.length - 1].no = 100 - currentYes;
  }

  return data;
}

// Generate order book data
function generateOrderBook(currentYes: number) {
  const bids: { price: number; size: number; total: number }[] = [];
  const asks: { price: number; size: number; total: number }[] = [];
  
  const yesPrice = currentYes / 100;
  let bidTotal = 0;
  let askTotal = 0;
  
  for (let i = 0; i < 8; i++) {
    const price = Math.max(0.01, yesPrice - 0.01 - i * 0.02);
    const size = Math.floor(500 + Math.random() * 2000 * (1 + i * 0.3));
    bidTotal += size;
    bids.push({ price: Math.round(price * 100) / 100, size, total: bidTotal });
  }
  
  for (let i = 0; i < 8; i++) {
    const price = Math.min(0.99, yesPrice + 0.01 + i * 0.02);
    const size = Math.floor(500 + Math.random() * 2000 * (1 + i * 0.3));
    askTotal += size;
    asks.push({ price: Math.round(price * 100) / 100, size, total: askTotal });
  }
  
  return { bids, asks: asks.reverse(), maxTotal: Math.max(bidTotal, askTotal) };
}

// Generate recent trades
function generateMockTrades() {
  const sides = ["Buy YES", "Sell YES", "Buy NO", "Sell NO"];
  const now = new Date();
  
  return [...Array(12)].map((_, i) => ({
    id: i + 1,
    time: new Date(now.getTime() - i * 8 * 60000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    side: sides[Math.floor(Math.random() * sides.length)],
    price: (0.30 + Math.random() * 0.50).toFixed(2),
    quantity: Math.floor(Math.random() * 800) + 100,
    total: (50 + Math.random() * 300).toFixed(2),
  }));
}

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
            <YAxis hide domain={[0, maxTotal * 1.1]} />
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
                style={{ width: `${(bid.total / maxTotal) * 100}%` }} 
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
                style={{ width: `${(ask.total / maxTotal) * 100}%` }} 
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

  // Fetch real price history from CLOB API; fall back to generated data if unavailable
  const { data: realHistory } = usePriceHistory(market?.yesTokenId, timeframe);

  const chartData = useMemo(() => {
    if (!market) return [];
    if (realHistory && realHistory.length > 0) return realHistory;
    const days =
      timeframe === "24H" ? 1
      : timeframe === "7D" ? 7
      : timeframe === "30D" ? 30
      : timeframe === "3M" ? 90
      : 365;
    return generateHistoricalData(market.yesOdds, days);
  }, [market, timeframe, realHistory]);

  // Generate order book
  const orderBook = useMemo(() => {
    if (!market) return { bids: [], asks: [], maxTotal: 0 };
    return generateOrderBook(market.yesOdds);
  }, [market]);

  const trades = useMemo(() => generateMockTrades(), []);

  // Mock volatility data
  const volatility: 'low' | 'medium' | 'high' = 'medium';
  const momentum: 'bullish' | 'bearish' | 'neutral' = market && market.change24h > 0 ? 'bullish' : market && market.change24h < 0 ? 'bearish' : 'neutral';

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
              <Badge variant="secondary" className="text-caption gap-1">
                <Broadcast className="h-2.5 w-2.5 text-success animate-pulse" />
                Live
              </Badge>
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
                        {market.yesOdds}%
                      </div>
                      <div className="text-small text-muted-foreground">YES</div>
                    </div>
                    <div>
                      <div className="text-display font-bold text-destructive">
                        {market.noOdds}%
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
                              <div className="text-caption text-muted-foreground mt-1">
                                Range: {data?.low}% - {data?.high}%
                              </div>
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
                {/* Volume bars */}
                <div className="h-16 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill="oklch(50% 0 0)" 
                            opacity={0.3}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
                    <div className="relative">
                      <div className="overflow-x-auto">
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none md:hidden z-10" />
                        <table className="w-full min-w-[600px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-caption font-medium text-muted-foreground text-left p-3">Time</th>
                              <th className="text-caption font-medium text-muted-foreground text-left p-3">Side</th>
                              <th className="text-caption font-medium text-muted-foreground text-right p-3">Price</th>
                              <th className="text-caption font-medium text-muted-foreground text-right p-3">Qty</th>
                              <th className="text-caption font-medium text-muted-foreground text-right p-3">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trades.map((trade) => (
                              <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/50 transition-base">
                                <td className="text-small p-3 font-mono">{trade.time}</td>
                                <td className={`text-small p-3 ${
                                  trade.side.includes("YES") ? "text-success" : "text-destructive"
                                }`}>
                                  {trade.side}
                                </td>
                                <td className="text-small p-3 text-right font-mono">{trade.price}</td>
                                <td className="text-small p-3 text-right font-mono">{trade.quantity}</td>
                                <td className="text-small p-3 text-right font-mono">{trade.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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

            {/* AI Insights (Pro feature) */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkle className="h-4 w-4 text-primary" />
                <CardTitle className="text-subtitle">AI Insight</CardTitle>
                <Badge variant="secondary" className="ml-auto">Professional</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 filter blur-sm">
                  <p className="text-small text-muted-foreground">
                    This market&apos;s odds ({market.yesOdds}%) diverge from our model estimate (47%). 
                    Historical patterns suggest potential value opportunity.
                  </p>
                  <div className="flex items-center justify-between text-small">
                    <span className="text-muted-foreground">Model Confidence</span>
                    <span className="font-semibold">68%</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                  <div className="text-center p-4">
                    <p className="text-small font-medium mb-2">
                      Upgrade to Professional for AI insights
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/pricing">Upgrade</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
