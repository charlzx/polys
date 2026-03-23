"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { shortAddress, formatDollar } from "@/services/whales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  CurrencyDollar,
  ChartBar,
  ClockCounterClockwise,
  Warning,
} from "@phosphor-icons/react";

interface WhalePosition {
  conditionId: string;
  market: string;
  question: string;
  outcome: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  endDate?: string | null;
}

interface WhaleActivityItem {
  id: string;
  type: string;
  title: string;
  side: string;
  amount: number;
  price: number;
  outcome: string;
  timestamp: string;
}

interface WhaleProfileData {
  address: string;
  portfolioValue: number;
  positions: WhalePosition[];
  activity: WhaleActivityItem[];
}

async function fetchProfile(address: string): Promise<WhaleProfileData> {
  const res = await fetch(`/api/whales/profile?address=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-secondary transition-colors"
      aria-label="Copy address"
    >
      {copied ? (
        <Check weight="bold" className="h-4 w-4 text-success" />
      ) : (
        <Copy weight="regular" className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function PositionCard({ pos }: { pos: WhalePosition }) {
  const hasPnl = pos.cashPnl !== 0;
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <Badge
            variant="outline"
            className={`text-caption shrink-0 ${
              pos.outcome === "YES" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"
            }`}
          >
            {pos.outcome}
          </Badge>
          <p className="text-small font-medium line-clamp-2 flex-1">{pos.question}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-caption text-muted-foreground mb-0.5">Shares</div>
            <div className="text-small font-semibold">{pos.size.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-caption text-muted-foreground mb-0.5">Avg Price</div>
            <div className="text-small font-semibold">{Math.round(pos.avgPrice * 100)}¢</div>
          </div>
          <div>
            <div className="text-caption text-muted-foreground mb-0.5">Value</div>
            <div className="text-small font-semibold">{formatDollar(pos.currentValue)}</div>
          </div>
        </div>
        {hasPnl && (
          <div className={`mt-2 text-right text-small font-medium ${pos.cashPnl >= 0 ? "text-success" : "text-destructive"}`}>
            {pos.cashPnl >= 0 ? "+" : ""}{formatDollar(pos.cashPnl)} ({pos.percentPnl >= 0 ? "+" : ""}{pos.percentPnl.toFixed(1)}%)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ item }: { item: WhaleActivityItem }) {
  const isBuy = item.side === "BUY";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${
        isBuy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}>
        {isBuy ? <ArrowUp weight="bold" className="h-3.5 w-3.5" /> : <ArrowDown weight="bold" className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={`text-small font-semibold ${isBuy ? "text-success" : "text-destructive"}`}>
            {item.side}
          </span>
          <Badge variant="outline" className="text-caption px-1.5 py-0">{item.outcome}</Badge>
          <span className="text-small">{formatDollar(item.amount)}</span>
          <span className="text-caption text-muted-foreground">@ {Math.round(item.price * 100)}¢</span>
        </div>
        <p className="text-caption text-muted-foreground line-clamp-1">{item.title}</p>
      </div>
      <span className="text-caption text-muted-foreground shrink-0">{relativeTime(item.timestamp)}</span>
    </div>
  );
}

// Free users see a capped preview; pro/premium see full profile
const FREE_POSITION_LIMIT = 3;
const FREE_ACTIVITY_LIMIT = 5;

export default function WhalePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });
  const { user } = useAuth();
  const isPro = user?.tier === "pro" || user?.tier === "premium";

  const { data, isLoading, isError } = useQuery<WhaleProfileData>({
    queryKey: ["whale-profile-page", address],
    queryFn: () => fetchProfile(address),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: Boolean(address),
  });

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const allPositions = data?.positions ?? [];
  const allActivity = data?.activity ?? [];
  const visiblePositions = isPro ? allPositions : allPositions.slice(0, FREE_POSITION_LIMIT);
  const visibleActivity = isPro ? allActivity : allActivity.slice(0, FREE_ACTIVITY_LIMIT);
  const positionsCapped = !isPro && allPositions.length > FREE_POSITION_LIMIT;
  const activityCapped = !isPro && allActivity.length > FREE_ACTIVITY_LIMIT;

  const hasPositions = allPositions.length > 0;
  const hasActivity = allActivity.length > 0;
  const hasAnyData = hasPositions || hasActivity || (data?.portfolioValue ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-[120px] md:pt-[88px] pb-20 md:pb-0">
        <div className="container max-w-screen-lg py-6 md:py-8 space-y-6">

          {/* Back + Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
              <Link href="/whales">
                <ArrowLeft weight="bold" className="mr-2 h-4 w-4" />
                Back to Whale Tracker
              </Link>
            </Button>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-subtitle font-mono font-semibold">
                        {shortAddress(address)}
                      </span>
                      <CopyButton text={address} />
                    </div>
                    <p className="text-caption text-muted-foreground font-mono break-all">{address}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="text-right">
                      <div className="text-title font-bold">
                        {formatDollar(data?.portfolioValue ?? 0)}
                      </div>
                      <div className="text-caption text-muted-foreground">Portfolio Value</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* No data state */}
          {!isLoading && !isError && !hasAnyData && (
            <Card>
              <CardContent className="p-8 text-center">
                <Warning weight="duotone" className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-subtitle font-semibold mb-2">No data found</h3>
                <p className="text-small text-muted-foreground">
                  This address has no recorded activity on Polymarket, or it may not be an active trading wallet.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {isError && (
            <Card>
              <CardContent className="p-8 text-center">
                <Warning weight="duotone" className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h3 className="text-subtitle font-semibold mb-2">Failed to load profile</h3>
                <p className="text-small text-muted-foreground">
                  Could not fetch data for this wallet address.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Open Positions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card>
              <CardHeader className="p-4 md:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <ChartBar weight="duotone" className="h-5 w-5 text-primary" />
                  <CardTitle className="text-subtitle">Open Positions</CardTitle>
                  {hasPositions && (
                    <Badge variant="secondary" className="ml-auto text-caption">
                      {data!.positions.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-5 pt-0">
                {isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                  </div>
                ) : hasPositions ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {visiblePositions.map((pos, i) => (
                        <PositionCard key={`${pos.conditionId}-${i}`} pos={pos} />
                      ))}
                    </div>
                    {positionsCapped && (
                      <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-center text-small text-muted-foreground">
                        {allPositions.length - FREE_POSITION_LIMIT} more positions hidden —{" "}
                        <Link href="/pricing" className="text-primary underline">upgrade to Pro</Link> for full access
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-small text-muted-foreground p-2">
                    <CurrencyDollar weight="duotone" className="h-4 w-4" />
                    No open positions found for this wallet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Trade History */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <Card>
              <CardHeader className="p-4 md:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <ClockCounterClockwise weight="duotone" className="h-5 w-5 text-primary" />
                  <CardTitle className="text-subtitle">Trade History</CardTitle>
                  {hasActivity && (
                    <Badge variant="secondary" className="ml-auto text-caption">
                      {data!.activity.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-5 pt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasActivity ? (
                  <div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {visibleActivity.map((item) => (
                        <ActivityItem key={item.id} item={item} />
                      ))}
                    </div>
                    {activityCapped && (
                      <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-center text-small text-muted-foreground">
                        {allActivity.length - FREE_ACTIVITY_LIMIT} more trades hidden —{" "}
                        <Link href="/pricing" className="text-primary underline">upgrade to Pro</Link> for full history
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-small text-muted-foreground p-2">
                    <ClockCounterClockwise weight="duotone" className="h-4 w-4" />
                    No trade history found for this wallet.
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
