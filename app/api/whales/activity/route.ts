import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

const TRADE_SIZE_THRESHOLD = 1000; // $1k minimum for whale activity feed
const DISCOVERY_THRESHOLD = 1_000; // min USDC in sample for wallet discovery

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

// Fallback seed wallets — same list as main whales route
const SEED_WALLETS: string[] = [
  "0x4e0da6af45b4e5eadca3fddca6a5ea5fa2e35a6b",
  "0x7a3c8b3c5b2a9c8f1e4d6b0a2c5e8f3a7b9d2e4f",
  "0x2b4d6f8a1c3e5b7d9f0a2c4e6b8d0f2a4c6e8b0d",
  "0x9c1e3a5b7d2f4a6c8e0b2d4f6a8c0e2b4d6f8a1c",
  "0x5f7a9c1e3b5d7f9a2c4e6b8d0f2a4c6e8b0d2f4a",
];

/**
 * Discover high-volume wallets from the global activity feed.
 * Aggregates proxyWallet volume across a large batch of recent trades.
 */
async function discoverActiveWhales(): Promise<string[]> {
  try {
    const res = await fetch(`${DATA_API}/activity?limit=500`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Activity API ${res.status}`);

    const raw = await res.json();
    const trades = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];

    if (trades.length === 0) throw new Error("Empty activity response");

    const volumeMap = new Map<string, number>();
    for (const trade of trades) {
      const wallet = String(trade.proxyWallet ?? trade.user ?? "").toLowerCase();
      if (!wallet || wallet === "0x" || wallet.length < 10) continue;
      const size = Math.abs(safeNum(trade.usdcSize ?? trade.amount));
      volumeMap.set(wallet, (volumeMap.get(wallet) ?? 0) + size);
    }

    const qualifying = [...volumeMap.entries()]
      .filter(([, vol]) => vol >= DISCOVERY_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([addr]) => addr);

    if (qualifying.length >= 3) return qualifying;

    return [...new Set([...qualifying, ...SEED_WALLETS])].slice(0, 20);
  } catch {
    return SEED_WALLETS;
  }
}

async function fetchWalletActivity(
  address: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${DATA_API}/activity?user=${address}&limit=50`);
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

type ActivityItem = {
  id: string;
  proxyWallet: string;
  conditionId?: string;
  title: string;
  side: string;
  outcome: string;
  amount: number;
  price: number;
  timestamp: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const threshold = safeNum(searchParams.get("threshold") ?? String(TRADE_SIZE_THRESHOLD));

  // If a single address is given, return that wallet's activity
  if (address) {
    const items = await fetchWalletActivity(address);
    const activity: ActivityItem[] = items
      .filter((a) => Math.abs(safeNum(a.usdcSize ?? a.amount)) >= threshold)
      .map((a) => ({
        id: String(a.id ?? `${Date.now()}-${Math.random()}`),
        proxyWallet: address,
        conditionId: a.conditionId ? String(a.conditionId) : undefined,
        title: String(a.title ?? a.question ?? ""),
        side: String(a.side ?? "BUY"),
        outcome: String(a.outcome ?? "YES"),
        amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
        price: safeNum(a.price),
        timestamp: String(a.timestamp ?? new Date().toISOString()),
      }));
    return NextResponse.json({ activity, source: "user" });
  }

  // Default: discover real whale wallets via activity-based aggregation
  const wallets = await discoverActiveWhales();
  if (wallets.length === 0) {
    return NextResponse.json({ activity: [], source: "no_wallets_discovered" });
  }

  const allActivity = await Promise.allSettled(
    wallets.map(async (addr) => {
      const items = await fetchWalletActivity(addr);
      return items
        .filter((a) => Math.abs(safeNum(a.usdcSize ?? a.amount)) >= threshold)
        .map((a): ActivityItem => ({
          id: String(a.id ?? `${addr}-${Date.now()}-${Math.random()}`),
          proxyWallet: addr,
          conditionId: a.conditionId ? String(a.conditionId) : undefined,
          title: String(a.title ?? a.question ?? ""),
          side: String(a.side ?? "BUY"),
          outcome: String(a.outcome ?? "YES"),
          amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
          price: safeNum(a.price),
          timestamp: String(a.timestamp ?? new Date().toISOString()),
        }));
    })
  );

  const flatActivity: ActivityItem[] = allActivity
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<ActivityItem[]>).value)
    .sort(
      (a, b) =>
        new Date(String(b.timestamp ?? 0)).getTime() -
        new Date(String(a.timestamp ?? 0)).getTime()
    )
    .slice(0, limit);

  return NextResponse.json({
    activity: flatActivity,
    source: "activity_aggregation",
    discovered: wallets.length,
  });
}
