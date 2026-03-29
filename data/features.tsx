/**
 * Feature cards data for landing page
 * Describes core platform capabilities
 */

import { ChartBar, Shield, Bell, Stack } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { ComponentType } from "react";

export interface Feature {
  icon: Icon;
  title: string;
  description: string;
  Preview?: ComponentType;
}

function AnalyticsPreview() {
  const points = [42, 45, 43, 48, 51, 49, 54, 57, 55, 61, 63, 67];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 100;
  const height = 36;
  const step = width / (points.length - 1);
  const pathD = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="mt-3 rounded-lg bg-background/60 p-2 border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">US Election 2024</span>
        <span className="text-[10px] font-medium text-success">+12.4%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
        <path
          d={pathD}
          fill="none"
          style={{ stroke: "var(--color-success)" }}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

function ArbitragePreview() {
  return (
    <div className="mt-3 rounded-lg bg-background/60 p-2 border border-border/50 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground font-medium">Bitcoin above $100K</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between rounded px-1.5 py-0.5 bg-secondary/80">
          <span className="text-[9px] text-muted-foreground">Polymarket</span>
          <span className="text-[10px] font-mono font-semibold">67¢</span>
        </div>
        <span className="text-[9px] text-muted-foreground">vs</span>
        <div className="flex-1 flex items-center justify-between rounded px-1.5 py-0.5 bg-success/20 border border-success/30">
          <span className="text-[9px] text-muted-foreground">Kalshi</span>
          <span className="text-[10px] font-mono font-semibold text-success">71¢</span>
        </div>
      </div>
      <div className="text-[9px] text-success text-right">+4¢ spread detected</div>
    </div>
  );
}

function AlertsPreview() {
  return (
    <div className="mt-3 rounded-lg bg-background/60 p-2 border border-border/50">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
        <span className="text-[10px] text-muted-foreground flex-1 truncate">Fed Rate Decision</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-medium border border-success/30">
          Triggered
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 pl-3.5">
        YES odds crossed 75% threshold
      </p>
    </div>
  );
}

function MultiPlatformPreview() {
  return (
    <div className="mt-3 rounded-lg bg-background/60 p-2 border border-border/50">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1 px-2 py-1 rounded-md bg-secondary/80 border border-border/50">
          <div className="w-3 h-3 rounded-sm bg-primary/60 text-[7px] flex items-center justify-center font-bold text-white">P</div>
          <span className="text-[10px] font-medium">Polymarket</span>
        </div>
        <div className="flex items-center gap-1 flex-1 px-2 py-1 rounded-md bg-secondary/80 border border-border/50">
          <div className="w-3 h-3 rounded-sm bg-blue-500/60 text-[7px] flex items-center justify-center font-bold text-white">K</div>
          <span className="text-[10px] font-medium">Kalshi</span>
        </div>
      </div>
    </div>
  );
}

export const features: Feature[] = [
  {
    icon: ChartBar,
    title: "Real-time Analytics",
    description: "Track market odds and volume across multiple platforms with live updates.",
    Preview: AnalyticsPreview,
  },
  {
    icon: Shield,
    title: "Arbitrage Detection",
    description: "Automatically find pricing inefficiencies and profit opportunities.",
    Preview: ArbitragePreview,
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Get notified when markets move or hit your target prices.",
    Preview: AlertsPreview,
  },
  {
    icon: Stack,
    title: "Multi-platform",
    description: "Aggregate data from Polymarket, Kalshi, and more in one view.",
    Preview: MultiPlatformPreview,
  },
];
