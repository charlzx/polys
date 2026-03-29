"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface CandlestickPoint {
  t: number;
  v: number;
}

interface KalshiPriceChartProps {
  ticker: string;
  days?: number;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipLabel(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function KalshiPriceChart({ ticker, days = 7 }: KalshiPriceChartProps) {
  const [data, setData] = useState<CandlestickPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);

    fetch(`/api/kalshi/candlesticks?ticker=${encodeURIComponent(ticker)}&days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        const points: CandlestickPoint[] = json.candlesticks ?? [];
        setData(points);
        setHasData(points.length >= 2);
      })
      .catch(() => setHasData(false))
      .finally(() => setLoading(false));
  }, [ticker, days]);

  if (loading) {
    return <Skeleton className="h-[120px] w-full rounded-lg" />;
  }

  if (!hasData) return null;

  const minV = Math.max(0, Math.min(...data.map((d) => d.v)) - 5);
  const maxV = Math.min(100, Math.max(...data.map((d) => d.v)) + 5);

  return (
    <div className="space-y-1.5">
      <p className="text-caption text-muted-foreground">7-day price history</p>
      <div className="h-[110px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="t"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              domain={[minV, maxV]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value: number) => [`${value}%`, "YES"]}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
                padding: "6px 10px",
              }}
              labelStyle={{ color: "var(--muted-foreground)", marginBottom: "2px" }}
              itemStyle={{ color: "var(--foreground)" }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "var(--primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
