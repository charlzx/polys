import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

const TRADE_SIZE_THRESHOLD = 1000; // $1k minimum for whale activity

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

// Discover Polymarket-associated wallet addresses from Gamma API market data.
// Returns the unique set of marketMakerAddress values from top-volume markets.
async function discoverWallets(): Promise<string[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?active=true&limit=100&order=volume&ascending=false`
    );
    if (!res.ok) return [];
    const markets = (await res.json()) as Array<Record<string, unknown>>;
    return [
      ...new Set(
        markets
          .map((m) => String(m.marketMakerAddress ?? ""))
          .filter((a) => a && a !== "0x0000000000000000000000000000000000000000")
      ),
    ].slice(0, 20);
  } catch {
    return [];
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
        title: String(a.title ?? a.question ?? ""),
        side: String(a.side ?? "BUY"),
        outcome: String(a.outcome ?? "YES"),
        amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
        price: safeNum(a.price),
        timestamp: String(a.timestamp ?? new Date().toISOString()),
      }));
    return NextResponse.json({ activity, source: "user" });
  }

  // Default: discover wallets from Gamma API, then aggregate large trades
  const wallets = await discoverWallets();
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
    source: "gamma_market_makers",
    discovered: wallets.length,
  });
}
