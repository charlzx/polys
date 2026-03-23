"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import type { TransformedMarket } from "@/services/polymarket";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MarketPulseGridProps {
  markets: TransformedMarket[];
}

function getTileColor(change24h: number, yesOdds: number): string {
  if (change24h > 0) return "bg-success/70";
  if (change24h < 0) return "bg-destructive/70";
  if (yesOdds > 60) return "bg-success/40";
  if (yesOdds < 40) return "bg-destructive/40";
  return "bg-muted-foreground/30";
}

function formatVolume(volume: string | number | undefined): string {
  if (volume === undefined || volume === null || volume === "") return "N/A";
  const raw = typeof volume === "string" ? volume.replace(/[$,]/g, "") : String(volume);
  const num = parseFloat(raw);
  if (isNaN(num)) return String(volume);
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function MarketPulseGrid({ markets }: MarketPulseGridProps) {
  const top30 = useMemo(() => markets.slice(0, 30), [markets]);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const prevMarketsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newPulsing = new Set<string>();
    top30.forEach((m) => {
      const prev = prevMarketsRef.current.get(m.id);
      if (prev !== undefined && prev !== m.yesOdds) {
        newPulsing.add(m.id);
      }
      prevMarketsRef.current.set(m.id, m.yesOdds);
    });
    if (newPulsing.size > 0) {
      setPulsingIds(newPulsing);
      const timer = setTimeout(() => setPulsingIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [top30]);

  if (top30.length === 0) {
    return (
      <div className="grid grid-cols-6 gap-1.5 p-4">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="aspect-square rounded bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">
          Market Pulse
        </span>
        <span className="text-caption text-muted-foreground ml-auto">
          {top30.length} markets
        </span>
      </div>
      <TooltipProvider>
        <div className="grid grid-cols-6 gap-1.5">
          {top30.map((market) => {
            const isPulsing = pulsingIds.has(market.id);
            const colorClass = getTileColor(market.change24h, market.yesOdds);
            const changePositive = market.change24h >= 0;
            const volume = formatVolume(market.volume24h ?? market.volume);
            return (
              <Tooltip key={market.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded transition-all duration-300 cursor-default ${colorClass} ${
                      isPulsing ? "opacity-100 scale-110" : "opacity-70 scale-100"
                    }`}
                    style={{ transition: "opacity 0.3s ease, transform 0.3s ease" }}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] space-y-1 p-2.5">
                  <p className="font-semibold text-xs leading-snug line-clamp-2">{market.name}</p>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">YES</span>
                    <span className="font-medium">{market.yesOdds}¢</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">24h</span>
                    <span
                      className={`font-medium ${
                        changePositive ? "text-success" : "text-destructive"
                      }`}
                    >
                      {changePositive ? "+" : ""}
                      {market.change24h}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Vol</span>
                    <span className="font-medium">{volume}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-success/70" />
          <span className="text-caption text-muted-foreground">Up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-destructive/70" />
          <span className="text-caption text-muted-foreground">Down</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-muted-foreground/30" />
          <span className="text-caption text-muted-foreground">Flat</span>
        </div>
      </div>
    </div>
  );
}

export function SparklineStrip({ markets }: MarketPulseGridProps) {
  const top5 = useMemo(() => markets.slice(0, 5), [markets]);

  if (top5.length === 0) {
    return (
      <div className="flex items-end gap-2 h-12 px-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 bg-secondary/50 animate-pulse rounded-sm" style={{ height: "60%" }} />
        ))}
      </div>
    );
  }

  const maxOdds = Math.max(...top5.map((m) => m.yesOdds));
  const minOdds = Math.min(...top5.map((m) => m.yesOdds));
  const range = maxOdds - minOdds || 1;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm px-3 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">
          Top Markets
        </span>
      </div>
      <div className="flex items-end gap-2 h-10">
        {top5.map((market) => {
          const heightPct = 30 + ((market.yesOdds - minOdds) / range) * 70;
          const isUp = market.change24h >= 0;
          return (
            <div
              key={market.id}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${market.name}: ${market.yesOdds}%`}
            >
              <div
                className={`w-full rounded-sm transition-all duration-500 ${isUp ? "bg-success/70" : "bg-destructive/70"}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {top5.map((market) => (
          <div key={market.id} className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground font-mono tabular-nums">
              {market.yesOdds}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
