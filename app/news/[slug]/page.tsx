"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendUpIcon,
  TrendDownIcon,
  Newspaper,
  CaretLeft,
  ArrowSquareOut,
  Sparkle,
  ChartLine,
} from "@phosphor-icons/react";
import { usePriceHistory } from "@/services/polymarket";
import { useMarketSummary } from "@/services/ai";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface NewsDetailItem {
  id: string;
  slug: string;
  question: string;
  description: string;
  image?: string;
  yesOdds: number;
  noOdds?: number;
  change24h: number;
  volume: string;
  volume24h: string;
  category: string;
  tags: string[];
  endDate: string;
  yesTokenId?: string;
}

const sentimentColor: Record<string, string> = {
  "Bullish": "text-success",
  "Highly Bullish": "text-success",
  "Bearish": "text-destructive",
  "Highly Bearish": "text-destructive",
  "Neutral": "text-muted-foreground",
};

export default function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [market, setMarket] = useState<NewsDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [timeframe, setTimeframe] = useState("30D");

  useEffect(() => {
    if (!slug) return;

    const tryFetch = async () => {
      setIsLoading(true);
      try {
        // First try fetching by slug from markets API
        const slugRes = await fetch(`/api/markets?slug=${encodeURIComponent(slug)}&limit=1`);
        if (slugRes.ok) {
          const data = await slugRes.json();
          if (Array.isArray(data) && data.length > 0) {
            const raw = data[0];
            setMarket(transformRaw(raw));
            setIsLoading(false);
            return;
          }
        }

        // Try fetching by ID directly
        const idRes = await fetch(`/api/markets/${encodeURIComponent(slug)}`);
        if (idRes.ok) {
          const raw = await idRes.json();
          if (raw?.id) {
            setMarket(transformRaw(raw));
            setIsLoading(false);
            return;
          }
        }

        setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    tryFetch();
  }, [slug]);

  const { data: priceHistory } = usePriceHistory(market?.yesTokenId, timeframe);

  const chartData = useMemo(() => {
    return priceHistory && priceHistory.length > 0 ? priceHistory : [];
  }, [priceHistory]);

  const { data: aiSummary, isLoading: aiLoading, error: aiError } = useMarketSummary(market?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <main className="container py-8 flex-1 space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="w-full h-64 rounded-xl" />
          <Skeleton className="h-10 w-3/4" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !market) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <main className="container py-20 flex-1 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-title font-bold mb-3">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This prediction market event could not be found or is no longer available.
          </p>
          <Button asChild>
            <Link href="/news">Back to News</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const noOdds = market.noOdds ?? Math.round((100 - market.yesOdds) * 10) / 10;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero image */}
        <div className="relative w-full h-56 md:h-80 bg-secondary/50">
          {market.image ? (
            <Image
              src={market.image}
              alt={market.question}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container -mt-16 relative z-10 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-small text-muted-foreground mb-6">
            <Link href="/news" className="hover:text-foreground transition-colors flex items-center gap-1">
              <CaretLeft className="h-4 w-4" weight="bold" />
              News
            </Link>
            <span>/</span>
            <span className="truncate max-w-xs">{market.category}</span>
          </div>

          {/* Header */}
          <div className="mb-8 max-w-3xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline">{market.category}</Badge>
              {market.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-caption">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-title md:text-display font-bold leading-tight mb-3">
              {market.question}
            </h1>
            {market.endDate && (
              <p className="text-small text-muted-foreground">
                Market closes {market.endDate}
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Live odds card */}
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
                          {noOdds}%
                        </div>
                        <div className="text-small text-muted-foreground">NO</div>
                      </div>
                      <div className="pl-4 border-l border-border">
                        <div
                          className={`flex items-center text-subtitle font-semibold ${
                            market.change24h >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {market.change24h >= 0 ? (
                            <TrendUpIcon className="h-5 w-5 mr-1" />
                          ) : (
                            <TrendDownIcon className="h-5 w-5 mr-1" />
                          )}
                          {market.change24h >= 0 ? "+" : ""}
                          {market.change24h}%
                        </div>
                        <div className="text-small text-muted-foreground">24h change</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://polymarket.com/event/${market.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Trade on Polymarket
                          <ArrowSquareOut className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/markets/${market.id}`}>
                          View Market
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price history chart */}
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
                    <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <ChartLine className="h-8 w-8 opacity-30" />
                      <p className="text-small">No price history available for this timeframe.</p>
                    </div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="newsYesGradient" x1="0" y1="0" x2="0" y2="1">
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
                            tick={{ fill: "currentColor", fontSize: 11 }}
                            className="text-muted-foreground"
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, "YES odds"]}
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="yes"
                            stroke="oklch(45% 0.15 145)"
                            strokeWidth={2}
                            fill="url(#newsYesGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Market stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-small font-semibold">Market Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-small">
                    <span className="text-muted-foreground">Total Volume</span>
                    <span className="font-medium tabular-nums">{market.volume}</span>
                  </div>
                  <div className="flex items-center justify-between text-small">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium tabular-nums">{market.volume24h}</span>
                  </div>
                  {market.endDate && (
                    <div className="flex items-center justify-between text-small">
                      <span className="text-muted-foreground">Closes</span>
                      <span className="font-medium">{market.endDate}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-small">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="outline" className="text-caption">{market.category}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Resolution criteria */}
              {market.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-small font-semibold">Resolution Criteria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-small text-muted-foreground leading-relaxed">
                      {market.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* AI Insights */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkle weight="duotone" className="h-4 w-4 text-primary" />
                    <CardTitle className="text-small font-semibold">AI Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiLoading ? (
                    <>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </>
                  ) : aiError ? (
                    <p className="text-small text-muted-foreground">
                      Sign in to view AI insights for this market.
                    </p>
                  ) : aiSummary ? (
                    <>
                      <div>
                        <div className="text-caption text-muted-foreground mb-1">Sentiment</div>
                        <div className={`text-small font-semibold ${sentimentColor[aiSummary.sentiment] ?? ""}`}>
                          {aiSummary.sentiment}
                        </div>
                      </div>
                      {aiSummary.oneLiner && (
                        <div>
                          <div className="text-caption text-muted-foreground mb-1">Summary</div>
                          <p className="text-small italic">&ldquo;{aiSummary.oneLiner}&rdquo;</p>
                        </div>
                      )}
                      <div>
                        <div className="text-caption text-muted-foreground mb-1">Price Movement</div>
                        <p className="text-small">{aiSummary.priceMovementInsight}</p>
                      </div>
                      {aiSummary.riskFactors.length > 0 && (
                        <div>
                          <div className="text-caption text-muted-foreground mb-1">Risk Factors</div>
                          <ul className="space-y-1">
                            {aiSummary.riskFactors.map((r, i) => (
                              <li key={i} className="text-small text-muted-foreground flex gap-2">
                                <span className="text-destructive mt-0.5">•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="border-t border-border pt-3">
                        <div className="text-caption text-muted-foreground mb-1">Assessment</div>
                        <p className="text-small">{aiSummary.probabilityAssessment}</p>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function transformRaw(raw: Record<string, unknown>): NewsDetailItem {
  let yesOdds = 50;
  let noOdds = 50;
  try {
    const prices = JSON.parse(String(raw.outcomePrices ?? "[]"));
    if (Array.isArray(prices) && prices.length >= 2) {
      const yes = parseFloat(prices[0]);
      const no = parseFloat(prices[1]);
      if (!isNaN(yes) && !isNaN(no)) {
        yesOdds = Math.round(yes * 1000) / 10;
        noOdds = Math.round(no * 1000) / 10;
      }
    }
  } catch { /* ignore */ }

  let change24h = 0;
  const rawChange = raw.oneDayPriceChange;
  if (rawChange !== undefined && rawChange !== null) {
    const parsed = parseFloat(String(rawChange));
    if (!isNaN(parsed)) change24h = parseFloat((parsed * 100).toFixed(1));
  }

  const formatDollar = (v: unknown): string => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
    if (isNaN(n) || n === 0) return "$0";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  let yesTokenId: string | undefined;
  try {
    const tokenIds = JSON.parse(String(raw.clobTokenIds ?? "[]"));
    yesTokenId = tokenIds[0] ? String(tokenIds[0]) : undefined;
  } catch { /* ignore */ }

  const events = (raw.events as Array<{ category?: string }>) ?? [];
  const firstEvent = events[0];

  return {
    id: String(raw.id ?? ""),
    slug: String(raw.slug ?? raw.id ?? ""),
    question: String(raw.question ?? "Unknown Market"),
    description: String(raw.description ?? ""),
    image: (raw.image || raw.icon) as string | undefined,
    yesOdds,
    noOdds,
    change24h,
    volume: formatDollar((raw.volumeNum as number | undefined) ?? raw.volume),
    volume24h: formatDollar(raw.volume24hr),
    category: String(firstEvent?.category ?? raw.category ?? "General"),
    tags: Array.isArray(raw.tags)
      ? (raw.tags as Array<{ label: string }>).map((t) => t.label)
      : [],
    endDate: String(raw.endDateIso ?? (typeof raw.endDate === "string" ? raw.endDate.split("T")[0] : "")),
    yesTokenId,
  };
}
