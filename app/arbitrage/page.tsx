"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useArbitrage } from "@/hooks/useArbitrage";
import {
  TrendUpIcon,
  Clock,
  CaretDown,
  CaretUp,
  ArrowsCounterClockwise,
  ArrowUpRight,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { ArbitrageOpportunity } from "@/services/arbitrage";

function useCopyPosition() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copy = useCallback((opp: ArbitrageOpportunity) => {
    const text = [
      `Market: ${opp.market}`,
      ``,
      `Leg 1 — Buy YES on ${opp.platform2} at ${opp.odds2}¢: $${opp.yesCost.toLocaleString()}`,
      `Leg 2 — Buy NO on ${opp.platform1} at ${100 - opp.odds1}¢: $${opp.noCost.toLocaleString()}`,
      ``,
      `Capital deployed: $${opp.capital.toLocaleString()}`,
      `Estimated payout: $${opp.expectedReturn.toLocaleString()}`,
      `Profit: ${opp.profit}%`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(opp.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return { copy, copiedId };
}

export default function ArbitragePage() {
  const { user } = useAuth();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [minProfit, setMinProfit] = useState([2]);
  const [platforms, setPlatforms] = useState({
    polymarket: true,
    kalshi: true,
  });
  const { copy, copiedId } = useCopyPosition();
  const { shouldShowContent } = useAuthGuard({ redirectIfNotAuth: true });

  const { data, isLoading, isError, dataUpdatedAt, refetch } = useArbitrage();

  const allOpportunities = data?.opportunities ?? [];
  const stats = data?.stats ?? [
    { label: "Opportunities Found", value: "—" },
    { label: "Average Profit", value: "—" },
    { label: "Total Value Detected", value: "—" },
  ];

  const filteredOpportunities = allOpportunities.filter((opp) => {
    if (opp.profit < minProfit[0]) return false;
    const p1 = opp.platform1.toLowerCase();
    const p2 = opp.platform2.toLowerCase();
    if (!platforms.polymarket && (p1 === "polymarket" || p2 === "polymarket")) return false;
    if (!platforms.kalshi && (p1 === "kalshi" || p2 === "kalshi")) return false;
    return true;
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

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
        <div className="container max-w-screen-2xl py-6 md:py-8 space-y-4 md:space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-title md:text-display font-bold">Arbitrage Scanner</h1>
                <p className="text-small text-muted-foreground mt-1">
                  Detect cross-platform arbitrage opportunities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-small text-muted-foreground">
              <ArrowsCounterClockwise
                weight="regular"
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading
                ? "Scanning markets…"
                : lastUpdated
                ? `Updated ${lastUpdated}`
                : "Waiting for data"}
            </div>
          </motion.div>


          <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Filters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <div className="flex-1">
                        <label className="text-small font-medium mb-2 block">
                          Minimum Profit: {minProfit[0]}%
                        </label>
                        <Slider
                          value={minProfit}
                          onValueChange={setMinProfit}
                          min={1}
                          max={20}
                          step={1}
                          className="w-full max-w-xs"
                        />
                      </div>
                      <div className="flex gap-4">
                        {Object.entries(platforms).map(([key, value]) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 text-small capitalize"
                          >
                            <Checkbox
                              checked={value}
                              onCheckedChange={(checked) =>
                                setPlatforms((p) => ({ ...p, [key]: !!checked }))
                              }
                            />
                            {key}
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Opportunities List */}
              <div className="space-y-3">
                {isError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-small">
                        Unable to fetch market data.{" "}
                        <button
                          className="underline text-foreground"
                          onClick={() => refetch()}
                        >
                          Retry
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {[1, 2, 3].map((n) => (
                      <Card key={n} className="animate-pulse">
                        <CardContent className="p-4 h-20 bg-secondary/30 rounded-lg" />
                      </Card>
                    ))}
                  </motion.div>
                )}

                {!isLoading && !isError && filteredOpportunities.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardContent className="p-8 text-center">
                        <TrendUpIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-small font-medium mb-1">
                          No opportunities found
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {allOpportunities.length > 0
                            ? `${allOpportunities.length} total found — lower the profit threshold to see them`
                            : "Markets are currently priced efficiently across platforms"}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {!isLoading &&
                  filteredOpportunities.map((opp, index) => (
                    <motion.div
                      key={opp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                    >
                      <Card className="transition-base">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            {/* Market Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge
                                  variant={opp.status === "active" ? "default" : "secondary"}
                                  className="text-caption"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                      opp.status === "active"
                                        ? "bg-success"
                                        : "bg-warning"
                                    }`}
                                  />
                                  {opp.status === "active" ? "Active" : "Fading"}
                                </Badge>
                                <span className="text-caption text-muted-foreground flex items-center gap-1">
                                  <Clock weight="regular" className="h-3 w-3" />{" "}
                                  {opp.timeDetected}
                                </span>
                              </div>
                              <h3 className="text-small md:text-body font-medium line-clamp-2">
                                {opp.market}
                              </h3>
                              <p className="text-caption text-muted-foreground">
                                {opp.platform1} vs {opp.platform2}
                              </p>
                            </div>

                            {/* Profit Info */}
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="text-right">
                                <div className="text-subtitle md:text-title font-bold text-success">
                                  {opp.profit}%
                                </div>
                                <div className="text-caption text-muted-foreground">Profit</div>
                              </div>
                              <div className="text-right hidden sm:block">
                                <div className="text-small font-semibold">
                                  ${opp.capital.toLocaleString()}
                                </div>
                                <div className="text-caption text-muted-foreground">Capital</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setExpandedId(expandedId === opp.id ? null : opp.id)
                                }
                              >
                                {expandedId === opp.id ? (
                                  <CaretUp weight="bold" className="h-4 w-4" />
                                ) : (
                                  <CaretDown weight="bold" className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {expandedId === opp.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-border">
                                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 rounded-md bg-secondary/50">
                                      <div className="text-small font-medium mb-2">
                                        Position Structure
                                      </div>
                                      <div className="space-y-1 text-caption">
                                        <div>
                                          Buy YES on {opp.platform2} at {opp.odds2}¢: $
                                          {opp.yesCost.toLocaleString()}
                                        </div>
                                        <div>
                                          Buy NO on {opp.platform1} at{" "}
                                          {100 - opp.odds1}¢: $
                                          {opp.noCost.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-md bg-secondary/50">
                                      <div className="text-small font-medium mb-2">
                                        Expected Outcome
                                      </div>
                                      <div className="space-y-1 text-caption">
                                        <div>Capital deployed: ${opp.capital.toLocaleString()}</div>
                                        <div>Estimated payout: ${opp.expectedReturn.toLocaleString()}</div>
                                        <div className="text-success font-medium">
                                          Potential profit: $
                                          {(opp.expectedReturn - opp.capital).toLocaleString()} ({opp.profit}%)
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => copy(opp)}
                                      className="gap-1.5"
                                    >
                                      {copiedId === opp.id ? (
                                        <>
                                          <Check weight="bold" className="h-3.5 w-3.5 text-success" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy weight="regular" className="h-3.5 w-3.5" />
                                          Copy Positions
                                        </>
                                      )}
                                    </Button>
                                    {opp.polyMarketId && (
                                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                                        <Link href={`/markets/${opp.polyMarketId}`}>
                                          View on Polymarket
                                          <ArrowUpRight weight="bold" className="h-3.5 w-3.5" />
                                        </Link>
                                      </Button>
                                    )}
                                    {opp.kalshiExternalUrl && (
                                      <Button size="sm" variant="outline" asChild className="gap-1.5">
                                        <a href={opp.kalshiExternalUrl} target="_blank" rel="noopener noreferrer">
                                          Trade on Kalshi
                                          <ArrowUpRight weight="bold" className="h-3.5 w-3.5" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Stats Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader className="p-3 md:p-4 pb-2">
                  <CardTitle className="text-body md:text-subtitle">
                    Live Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0 space-y-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <span className="text-small text-muted-foreground">{stat.label}</span>
                      <span
                        className="text-small font-semibold"
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 md:p-4 pb-2">
                  <CardTitle className="text-body md:text-subtitle">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <ol className="space-y-3 text-small text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      We scan prices across platforms in real-time
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      Detect price discrepancies between platforms
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      Execute on both platforms to capture the spread
                    </li>
                  </ol>
                  <p className="text-caption text-muted-foreground mt-4 pt-3 border-t border-border">
                    Actual returns may vary due to order book depth and slippage. Always verify prices before executing.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
