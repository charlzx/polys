import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

export const runtime = "edge";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
// Maximum wallets to profile after discovery (edge timeout guard)
const MAX_PROFILE = 20;

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

// Dynamically discover Polymarket-associated wallet addresses from Gamma API
// market maker contracts, then filter to those with actual on-chain activity.
async function discoverWallets(): Promise<string[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?active=true&limit=100&order=volume&ascending=false`
    );
    if (!res.ok) return [];
    const markets = (await res.json()) as Array<Record<string, unknown>>;
    const addresses = [
      ...new Set(
        markets
          .map((m) => String(m.marketMakerAddress ?? ""))
          .filter((a) => a && a !== "0x0000000000000000000000000000000000000000")
      ),
    ];
    return addresses.slice(0, MAX_PROFILE);
  } catch {
    return [];
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
    // Discover wallets dynamically from Gamma API market data
    const wallets = await discoverWallets();

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
      // Sort by 30-day volume descending; wallets with any data rank above those with none
      .sort((a, b) => {
        if (a.hasData && !b.hasData) return -1;
        if (!a.hasData && b.hasData) return 1;
        return b.totalVolume - a.totalVolume;
      })
      // Apply limit AFTER ranking the full discovered universe
      .slice(0, limit);

    return NextResponse.json({ whales, source: "gamma_market_makers", discovered: wallets.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
