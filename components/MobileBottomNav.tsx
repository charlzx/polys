"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { House, TrendUpIcon, ChartBar, Eye, Bell, Wallet } from "@phosphor-icons/react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Markets", href: "/markets", icon: TrendUpIcon },
  { label: "Kalshi", href: "/kalshi", icon: ChartBar },
  { label: "Whales", href: "/whales", icon: Eye },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-full px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-base",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon weight={isActive ? "fill" : "regular"} className="h-5 w-5" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
