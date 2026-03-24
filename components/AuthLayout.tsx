"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TrendUp, Lightning, ChartLineUp } from "@phosphor-icons/react";

const STATS = [
  { icon: TrendUp, label: "Real-time odds" },
  { icon: Lightning, label: "Arbitrage alerts" },
  { icon: ChartLineUp, label: "Market intelligence" },
];

function HexBigMark() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="text-primary"
      aria-hidden="true"
    >
      <polygon points="22,12 17,3.3 7,3.3 2,12 7,20.7 17,20.7" />
    </svg>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-secondary/40">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-border bg-background">
        <Link href="/" className="flex items-center">
          <Logo size="sm" showWordmark />
        </Link>
      </header>

      {/* Form Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
        {/* Card */}
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
          {/* Identity mark */}
          <div className="flex items-center gap-2.5 mb-6">
            <HexBigMark />
            <span className="text-caption text-muted-foreground font-medium tracking-wide uppercase">
              Polys
            </span>
          </div>

          {children}
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {STATS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-caption text-muted-foreground"
            >
              <Icon weight="bold" className="h-3 w-3 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
