"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendUpIcon,
  TrendDownIcon,
  Star,
  ArrowsClockwise,
  Flag,
  Broadcast,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLiveFeed, type FeedEvent, type FeedEventType } from "@/hooks/useLiveFeed";

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

const EVENT_STYLES: Record<
  FeedEventType,
  { icon: React.ElementType; bg: string; text: string }
> = {
  price_up: {
    icon: TrendUpIcon,
    bg: "bg-success/15",
    text: "text-success",
  },
  price_down: {
    icon: TrendDownIcon,
    bg: "bg-destructive/15",
    text: "text-destructive",
  },
  whale_buy: {
    icon: Star,
    bg: "bg-violet-500/15",
    text: "text-violet-500",
  },
  whale_sell: {
    icon: Star,
    bg: "bg-violet-500/15",
    text: "text-violet-500",
  },
  arb: {
    icon: ArrowsClockwise,
    bg: "bg-amber-500/15",
    text: "text-amber-500",
  },
  milestone: {
    icon: Flag,
    bg: "bg-primary/15",
    text: "text-primary",
  },
};

function FeedRow({ event }: { event: FeedEvent }) {
  const style = EVENT_STYLES[event.type];
  const Icon = style.icon;

  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
    >
      <div
        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-0.5 ${style.bg}`}
      >
        <Icon weight="bold" className={`h-4 w-4 ${style.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-small font-semibold leading-tight ${style.text}`}>
          {event.title}
        </p>
        <p className="text-caption text-muted-foreground line-clamp-1 mt-0.5 group-hover:text-foreground transition-colors">
          {event.subtitle}
        </p>
        <p className="text-caption text-muted-foreground/60 mt-0.5">
          {relTime(event.timestamp)}
        </p>
      </div>
    </motion.div>
  );

  if (event.marketId) {
    return (
      <Link href={`/markets/${event.marketId}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

interface LiveFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function LiveFeed({
  limit = 15,
  showHeader = true,
  compact = false,
  className = "",
}: LiveFeedProps) {
  const { events, isLoading } = useLiveFeed(limit);

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-subtitle font-semibold">Live Feed</h3>
            <Badge variant="secondary" className="text-caption gap-1 px-2 py-0.5">
              <Broadcast weight="fill" className="h-2.5 w-2.5 text-success animate-pulse" />
              Live
            </Badge>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(compact ? 3 : 5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-small text-muted-foreground p-4 text-center">
          No recent activity yet.
        </p>
      ) : (
        <div className={`space-y-0.5 ${compact ? "" : "max-h-[400px] overflow-y-auto pr-1"}`}>
          <AnimatePresence initial={false}>
            {events.slice(0, compact ? 3 : limit).map((event) => (
              <FeedRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
