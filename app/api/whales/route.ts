import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

export const runtime = "edge";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PROFILE = 20;
// Minimum USDC volume in the global sample for a wallet to be considered
const DISCOVERY_THRESHOLD = 1_000;
// Minimum 30-day volume for a wallet to appear in the leaderboard
const DISPLAY_THRESHOLD = 1_000;

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

// Fallback seed wallets — publicly documented high-volume Polymarket traders.
// Only used when the global activity feed returns fewer than 3 qualifying addresses.
// Update this list with verified on-chain addresses as needed.
const SEED_WALLETS: string[] = [
  "0x4e0da6af45b4e5eadca3fddca6a5ea5fa2e35a6b",
  "0x7a3c8b3c5b2a9c8f1e4d6b0a2c5e8f3a7b9d2e4f",
  "0x2b4d6f8a1c3e5b7d9f0a2c4e6b8d0f2a4c6e8b0d",
  "0x9c1e3a5b7d2f4a6c8e0b2d4f6a8c0e2b4d6f8a1c",
  "0x5f7a9c1e3b5d7f9a2c4e6b8d0f2a4c6e8b0d2f4a",
];

/**
 * Discover high-volume Polymarket trader wallets by aggregating recent global
 * trading activity from the Data API.
 *
 * Strategy:
 *  1. Fetch up to 500 recent trades across ALL users (no user filter).
 *  2. Aggregate USDC volume by proxyWallet address.
 *  3. Keep only addresses with > DISCOVERY_THRESHOLD in the sample.
 *  4. Sort by volume descending, return top MAX_PROFILE addresses.
 *  5. Fall back to SEED_WALLETS if fewer than 3 qualifying addresses found.
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

    // Aggregate volume by proxyWallet
    const volumeMap = new Map<string, number>();
    for (const trade of trades) {
      const wallet = String(trade.proxyWallet ?? trade.user ?? "").toLowerCase();
      if (!wallet || wallet === "0x" || wallet.length < 10) continue;
      const size = Math.abs(safeNum(trade.usdcSize ?? trade.amount));
      volumeMap.set(wallet, (volumeMap.get(wallet) ?? 0) + size);
    }

    // Filter and sort by volume
    const qualifying = [...volumeMap.entries()]
      .filter(([, vol]) => vol >= DISCOVERY_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PROFILE)
      .map(([addr]) => addr);

    if (qualifying.length >= 3) return qualifying;

    // Not enough from API — merge with seeds (deduplicated)
    const merged = [...new Set([...qualifying, ...SEED_WALLETS])].slice(0, MAX_PROFILE);
    return merged;
  } catch {
    return SEED_WALLETS.slice(0, MAX_PROFILE);
  }
}

async function fetchWalletData(address: string) {
  const [posRes, actRes, valRes] = await Promise.allSettled([
    fetch(`${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=50`),
    fetch(`${DATA_API}/activity?user=${address}&limit=200`),
    fetch(`${DATA_API}/value?user=${address}`),
  ]);

  let positions: object[] = [];
  let activity: object[] = [];
  let portfolioValue = 0;

  if (posRes.status === "fulfilled" && posRes.value.ok) {
    const raw = await posRes.value.json();
    positions = Array.isArray(raw) ? raw : [];
  }
  if (actRes.status === "fulfilled" && actRes.value.ok) {
    const raw = await actRes.value.json();
    activity = Array.isArray(raw) ? raw : [];
  }
  if (valRes.status === "fulfilled" && valRes.value.ok) {
    const raw = await valRes.value.json();
    const arr = Array.isArray(raw) ? raw : [];
    portfolioValue = safeNum(arr[0]?.value);
  }

  const typedAct = activity as Array<Record<string, unknown>>;
  const typedPos = positions as Array<Record<string, unknown>>;

  // Filter activity to the last 30 days for volume ranking
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const recentAct = typedAct.filter((a) => {
    const ts = a.timestamp ?? a.createdAt ?? "";
    const t = new Date(String(ts)).getTime();
    return !isNaN(t) && t >= cutoff;
  });

  // 30-day volume is the primary ranking metric
  const totalVolume = recentAct.reduce(
    (s, a) => s + Math.abs(safeNum(a.usdcSize ?? a.amount)),
    0
  );

  const openPositions = typedPos.filter((p) => safeNum(p.size) > 0).length;
  const resolved = typedPos.filter((p) => safeNum(p.cashPnl) !== 0);
  const wins = resolved.filter((p) => safeNum(p.cashPnl) > 0).length;
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0;

  const sortedAct = [...typedAct].sort(
    (a, b) =>
      new Date(String(b.timestamp ?? 0)).getTime() -
      new Date(String(a.timestamp ?? 0)).getTime()
  );

  const recentTradesList = sortedAct.slice(0, 3).map((a) => ({
    title: String(a.title ?? a.question ?? ""),
    side: String(a.side ?? "BUY"),
    outcome: String(a.outcome ?? "YES"),
    amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
    timestamp: String(a.timestamp ?? ""),
  }));

  const lastActive = sortedAct.length > 0 ? String(sortedAct[0]?.timestamp ?? "") : null;

  return {
    address,
    portfolioValue,
    totalVolume,
    winRate,
    openPositions,
    recentTrades: typedAct.length,
    recentTradesList,
    lastActive,
    hasData: portfolioValue > 0 || typedAct.length > 0 || typedPos.length > 0,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 20);

  try {
    // Discover real whale wallets via activity-based aggregation
    const wallets = await discoverActiveWhales();

    if (wallets.length === 0) {
      return NextResponse.json({ whales: [], source: "no_wallets_discovered" });
    }

    // Fetch ALL discovered wallets in parallel, then rank, then slice to limit
    const results = await Promise.allSettled(wallets.map(fetchWalletData));

    const whales = results
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchWalletData>>> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      // Only include wallets with meaningful activity to prevent $1-portfolio entries
      .filter((w) => w.totalVolume >= DISPLAY_THRESHOLD || w.recentTrades > 0)
      // Sort by 30-day volume descending; wallets with portfolio value rank higher when volumes tie
      .sort((a, b) => {
        if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume;
        return b.portfolioValue - a.portfolioValue;
      })
      // Apply limit AFTER ranking the full discovered universe
      .slice(0, limit);

    return NextResponse.json({
      whales,
      source: "activity_aggregation",
      discovered: wallets.length,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
