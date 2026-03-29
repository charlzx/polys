// recentAlerts removed — dashboard now uses useAlerts hook with real Supabase data

import { Bell, Lightning, TrendUpIcon } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

// Alert management page data
export interface UserAlert {
  id: number;
  name: string;
  type: string;
  market: string;
  condition: string;
  delivery: string[];
  active: boolean;
  lastTriggered: string;
  triggerCount: number;
}

export const alerts: UserAlert[] = [
  {
    id: 1,
    name: "BTC >$150k odds spike",
    type: "Odds Movement",
    market: "Bitcoin to reach $150k by March 2027",
    condition: "When YES odds increase by >10% within 24h",
    delivery: ["email", "push"],
    active: true,
    lastTriggered: "2 hours ago",
    triggerCount: 3,
  },
  {
    id: 2,
    name: "Election volume alert",
    type: "Volume Spike",
    market: "2026 Midterm Elections",
    condition: "When volume increases by >100% in 1 hour",
    delivery: ["email"],
    active: true,
    lastTriggered: "1 day ago",
    triggerCount: 8,
  },
  {
    id: 3,
    name: "Fed decision movement",
    type: "Odds Movement",
    market: "Fed Rate Cut Q1 2026",
    condition: "When odds change by >15% either direction",
    delivery: ["push"],
    active: false,
    lastTriggered: "5 days ago",
    triggerCount: 2,
  },
  {
    id: 4,
    name: "New crypto markets",
    type: "New Market",
    market: "All markets matching 'crypto'",
    condition: "When a new crypto market is created",
    delivery: ["email", "push"],
    active: true,
    lastTriggered: "3 hours ago",
    triggerCount: 12,
  },
  {
    id: 5,
    name: "AI market tracker",
    type: "Odds Movement",
    market: "GPT-5 Release by June 2026",
    condition: "When YES odds increase by >8% within 12h",
    delivery: ["email"],
    active: true,
    lastTriggered: "6 hours ago",
    triggerCount: 5,
  },
];

export interface AlertStat {
  label: string;
  value: string;
  icon: Icon;
}

export const alertStats: AlertStat[] = [
  { label: "Total Alerts", value: "12", icon: Bell },
  { label: "Active", value: "8", icon: Lightning },
  { label: "Triggered Today", value: "5", icon: TrendUpIcon },
];

// 'arbitrage' is intentionally excluded — the check engine does not evaluate it
export const alertTypes = [
  { value: "odds", label: "Odds Movement" },
  { value: "volume", label: "Volume Spike" },
  { value: "new", label: "New Market" },
];
