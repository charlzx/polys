"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, Broadcast } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhaleActivity, type ActivityEvent } from "@/hooks/useWhales";
import { formatDollar, shortAddress } from "@/services/whales";

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const isBuy = event.side === "BUY";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
    >
      <div
        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-0.5 ${
          isBuy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        }`}
      >
        {isBuy ? (
          <ArrowUp weight="bold" className="h-4 w-4" />
        ) : (
          <ArrowDown weight="bold" className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <Link
            href={`/whales/${event.proxyWallet}`}
            className="text-caption font-mono text-primary hover:underline"
          >
            {shortAddress(event.proxyWallet)}
          </Link>
          <span className={`text-small font-semibold ${isBuy ? "text-success" : "text-destructive"}`}>
            {isBuy ? "BUY" : "SELL"}
          </span>
          <Badge variant="outline" className="text-caption px-1.5 py-0">
            {event.outcome}
          </Badge>
          <span className="text-small font-medium">{formatDollar(event.amount)}</span>
        </div>
        <p className="text-caption text-muted-foreground line-clamp-1">{event.title}</p>
        <p className="text-caption text-muted-foreground mt-0.5">{relativeTime(event.timestamp)}</p>
      </div>
    </motion.div>
  );
}

interface WhaleActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function WhaleActivityFeed({
  limit = 8,
  showHeader = true,
  className = "",
}: WhaleActivityFeedProps) {
  const { data, isLoading, isError } = useWhaleActivity(limit);

  const hasActivity = (data?.activity?.length ?? 0) > 0;

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-subtitle font-semibold">Whale Activity</h3>
            {data && (
              <Badge variant="secondary" className="text-caption gap-1 px-2 py-0.5">
                <Broadcast weight="fill" className="h-2.5 w-2.5 text-success animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <Link href="/whales" className="text-caption text-primary hover:underline">
            View all
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-small text-muted-foreground p-3">Failed to load activity.</p>
      ) : hasActivity ? (
        <div className="space-y-0.5">
          <AnimatePresence initial={false}>
            {(data?.activity ?? []).slice(0, limit).map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-small text-muted-foreground p-4 text-center">
          No large trades found from tracked wallets at this time.
        </p>
      )}
    </div>
  );
}
