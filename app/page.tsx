"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MobileNav, MobileNavTrigger } from "@/components/MobileNav";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { useMarkets } from "@/services/polymarket";
import { useMarketWebSocket } from "@/hooks/useMarketWebSocket";
import type { TransformedMarket } from "@/services/polymarket";
import { features } from "@/data/features";
import { categories } from "@/data/categories";
import { LiveFeed } from "@/components/LiveFeed";
import { MarketPulseGrid, SparklineStrip } from "@/components/MarketPulseGrid";
import { CategoryTabs } from "@/components/CategoryTabs";
import {
  MagnifyingGlass,
  TrendUpIcon,
  TrendDownIcon,
  CaretRight,
  Lightning,
  Broadcast,
  ArrowRight,
  Pulse,
  Newspaper,
} from "@phosphor-icons/react";
import { useState, useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

// Single ticker item — defined outside component to avoid hook-violation during render
function TickerItem({ market }: { market: TransformedMarket }) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="flex items-center gap-2 px-6 py-3 whitespace-nowrap border-r border-border/50 hover:bg-secondary/50 transition-colors"
    >
      <span className="text-small text-foreground font-medium line-clamp-1 max-w-[200px]">
        {market.name}
      </span>
      <Badge variant="secondary" className="text-caption shrink-0">
        {market.yesOdds}¢
      </Badge>
      {market.change24h !== 0 && (
        <span className={`text-caption flex items-center gap-0.5 shrink-0 ${
          market.change24h > 0 ? "text-success" : "text-destructive"
        }`}>
          {market.change24h > 0 ? (
            <TrendUpIcon weight="bold" className="h-3 w-3" />
          ) : (
            <TrendDownIcon weight="bold" className="h-3 w-3" />
          )}
          {Math.abs(market.change24h)}%
        </span>
      )}
    </Link>
  );
}

// Infinite scrolling live markets ticker
function PredictionsTicker({ markets }: { markets: TransformedMarket[] }) {
  const items = markets.slice(0, 10);
  if (items.length === 0) {
    return (
      <div className="border-b border-border bg-secondary/30 h-[42px] animate-pulse" />
    );
  }

  return (
    <div className="relative overflow-hidden border-b border-border bg-secondary/30">
      <div className="flex animate-scroll">
        {items.map((m) => <TickerItem key={`first-${m.id}`} market={m} />)}
        {items.map((m) => <TickerItem key={`second-${m.id}`} market={m} />)}
      </div>
    </div>
  );
}

// Featured market component with animation and inner-glow hover effect
function FeaturedMarket({ market, isLive, index }: { market: TransformedMarket; isLive?: boolean; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        href={`/markets/${market.id}`}
        className="block rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.15)] transition-all group overflow-hidden min-h-[44px]"
      >
        {/* Event image */}
        <div className="relative w-full h-28 bg-secondary/50">
          {market.image ? (
            <Image
              src={market.image}
              alt={market.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-caption">
                  {market.category}
                </Badge>
                {isLive && (
                  <span className="flex items-center gap-1 text-caption text-success">
                    <Broadcast weight="fill" className="h-2.5 w-2.5 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <h3 className="text-body font-medium mb-1 group-hover:text-primary transition-colors line-clamp-2">
                {market.name}
              </h3>
              <div className="flex items-center gap-3 text-caption text-muted-foreground">
                <span>{market.volume} Vol</span>
                <span
                  className={`flex items-center gap-0.5 ${
                    market.change24h >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {market.change24h >= 0 ? (
                    <TrendUpIcon weight="bold" className="h-3 w-3" />
                  ) : (
                    <TrendDownIcon weight="bold" className="h-3 w-3" />
                  )}
                  {market.change24h >= 0 ? "+" : ""}
                  {market.change24h}%
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-subtitle font-bold text-success">
                {market.yesOdds}%
              </div>
              <div className="text-caption text-muted-foreground">YES</div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Mobile-friendly market row
function MarketRow({ market, rank }: { market: TransformedMarket; rank: number }) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors group min-h-[44px]"
    >
      <span className="text-caption text-muted-foreground w-5 text-center font-mono shrink-0">
        {rank}
      </span>
      {/* Small market image */}
      <div className="relative w-8 h-8 rounded-md overflow-hidden bg-secondary/70 shrink-0 hidden sm:block">
        {market.image ? (
          <Image
            src={market.image}
            alt=""
            fill
            className="object-cover"
            sizes="32px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="outline" className="text-caption shrink-0 px-1.5 py-0">
            {market.category}
          </Badge>
          <span
            className={`text-caption font-medium shrink-0 ${
              market.change24h >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {market.change24h >= 0 ? "+" : ""}
            {market.change24h}%
          </span>
        </div>
        <span className="text-small font-medium line-clamp-1 group-hover:text-primary transition-colors">
          {market.name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden hidden sm:block">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${market.yesOdds}%` }}
          />
        </div>
        <span className="text-small font-bold w-10 text-right tabular-nums">
          {market.yesOdds}%
        </span>
        <CaretRight weight="bold" className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

// Stats ticker component
function StatsTicker() {
  return (
    <div className="flex items-center gap-8 text-small">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Markets Tracked</span>
        <span className="font-mono font-semibold">2,847</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">24h Volume</span>
        <span className="font-mono font-semibold">42.3M</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Active Users</span>
        <span className="font-mono font-semibold">18.2K</span>
      </div>
    </div>
  );
}

// Stacking Feature Card Component with improved animation (mobile)
function StackingFeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "start center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.8, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const stickyTop = 100 + index * 20;

  return (
    <motion.div
      ref={cardRef}
      style={{
        scale,
        opacity,
        y,
        position: "sticky",
        top: stickyTop,
        zIndex: index,
      }}
      className="p-5 rounded-2xl bg-card border border-border shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <feature.icon weight="duotone" className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-subtitle font-semibold mb-2">{feature.title}</h3>
          <p className="text-small text-muted-foreground">{feature.description}</p>
          {feature.preview && <div>{feature.preview}</div>}
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  const { data: markets, isLoading } = useMarkets({ limit: 20, active: true });

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
    enabled: (markets?.length ?? 0) > 0,
  });

  const liveMarkets = useMemo(() => {
    if (!markets) return [];
    return applyUpdatesToMarkets(markets);
  }, [markets, applyUpdatesToMarkets]);

  const filteredMarkets = useMemo(() => {
    let result = liveMarkets;

    if (selectedCategory !== "All" && selectedCategory !== "Trending") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [liveMarkets, selectedCategory, searchQuery]);

  const featuredMarkets = filteredMarkets.slice(0, 4);
  const remainingMarkets = filteredMarkets.slice(4, 12);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Header */}
      <PublicHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMobileNavOpen={() => setMobileNavOpen(true)}
      />

      {/* Live markets ticker */}
      <PredictionsTicker markets={liveMarkets} />

      {/* Hero Section — split layout */}
      <section
        ref={heroRef}
        className="border-b border-border bg-gradient-to-b from-secondary/30 to-background"
      >
        <div className="container py-10 md:py-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Left column */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex items-center gap-2 mb-4"
              >
                <Badge variant="secondary" className="font-medium">
                  <Pulse weight="fill" className="h-3 w-3 mr-1" />
                  Real-time Analytics
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="text-success border-success/30">
                    <Broadcast weight="fill" className="h-2.5 w-2.5 mr-1 animate-pulse" />
                    Connected
                  </Badge>
                )}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
                className="font-bold leading-[1.1] tracking-tight mb-4"
              >
                Prediction Market
                <br />
                <span className="text-muted-foreground">Intelligence</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-body md:text-subtitle text-muted-foreground mb-8 max-w-xl"
              >
                Track odds, detect arbitrage opportunities, and analyze market sentiment across Polymarket, Kalshi, and more. All in real-time.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6"
              >
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/auth?mode=signup">
                    Start for free
                    <ArrowRight weight="bold" className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/dashboard">View dashboard</Link>
                </Button>
              </motion.div>

              {/* Mobile sparkline strip — below CTAs, above md */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="md:hidden mb-6"
              >
                <SparklineStrip markets={liveMarkets} />
              </motion.div>

              {/* Happening Now strip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm max-w-md"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightning weight="fill" className="h-3.5 w-3.5 text-primary" />
                  <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">Happening Now</span>
                </div>
                <LiveFeed limit={3} showHeader={false} compact={true} />
              </motion.div>
            </div>

            {/* Right column — Market Pulse Grid (desktop only) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden lg:block"
            >
              <MarketPulseGrid markets={liveMarkets} />
            </motion.div>
          </div>

          {/* Stats ticker - desktop only */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="hidden lg:flex items-center gap-8 mt-12 pt-8 border-t border-border/50"
          >
            <StatsTicker />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 border-b border-border">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-title md:text-display font-bold mb-4">
              Everything you need to trade smarter
            </h2>
            <p className="text-body text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools for prediction market analysis, all in one platform.
            </p>
          </motion.div>

          {/* Grid on desktop */}
          <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.12)] transition-all flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon weight="duotone" className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-subtitle font-semibold mb-2">{feature.title}</h3>
                <p className="text-small text-muted-foreground">{feature.description}</p>
                {feature.preview && <div className="mt-auto">{feature.preview}</div>}
              </motion.div>
            ))}
          </div>

          {/* Stacking cards on mobile */}
          <div className="md:hidden relative" style={{ minHeight: `${features.length * 220}px` }}>
            {features.map((feature, index) => (
              <StackingFeatureCard
                key={feature.title}
                feature={feature}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Search */}
      <div className="md:hidden border-b border-border bg-background px-4 py-3">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-secondary/50 border-transparent focus:border-border"
          />
        </div>
      </div>

      {/* Category tabs — animated pill strip */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="container">
          <CategoryTabs selected={selectedCategory} onChange={setSelectedCategory} />
        </div>
      </div>

      {/* Main content */}
      <main className="container py-6 flex-1">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured markets grid */}
            {featuredMarkets.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-subtitle font-semibold">Top Markets</h2>
                  <Link
                    href="/markets"
                    className="text-small text-primary hover:underline flex items-center gap-1"
                  >
                    View all <CaretRight weight="bold" className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredMarkets.map((market, index) => (
                    <FeaturedMarket
                      key={market.id}
                      market={market}
                      isLive={isConnected}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Market list */}
            {remainingMarkets.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-subtitle font-semibold">All Markets</h2>
                  <div className="hidden sm:flex items-center gap-4 text-caption text-muted-foreground">
                    <span className="w-16">Odds</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
                  {remainingMarkets.map((market, index) => (
                    <MarketRow
                      key={market.id}
                      market={market}
                      rank={index + 5}
                    />
                  ))}
                </div>
              </section>
            )}

            {filteredMarkets.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No markets found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
