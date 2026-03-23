import { NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";

export const runtime = "edge";

const TRADE_SIZE_THRESHOLD = 1000; // $1k minimum for "whale" activity

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

// Build synthetic activity events from high-volume markets
function buildActivityFromMarkets(markets: Record<string, unknown>[]): object[] {
  const events: object[] = [];
  const sides: ("YES" | "NO")[] = ["YES", "NO"];
  const actions: ("BUY" | "SELL")[] = ["BUY", "SELL"];

  for (const m of markets) {
    const vol24h = safeNum(m.volume24hr);
    if (vol24h < TRADE_SIZE_THRESHOLD) continue;

    // Derive implied trade count from volume (average ~$2k per whale trade)
    const tradeCount = Math.min(Math.floor(vol24h / 5000), 3);

    let yesPrice = 50;
    try {
      const prices = JSON.parse(String(m.outcomePrices ?? "[]"));
      yesPrice = Math.round(safeNum(prices[0]) * 100);
    } catch {
      yesPrice = Math.round(safeNum(m.lastTradePrice) * 100);
    }

    for (let i = 0; i < tradeCount; i++) {
      const outcome = sides[i % 2];
      const action = actions[Math.floor(Math.random() * 2)];
      // Stagger times back from now: each market gets slightly different stamps
      const minutesAgo = (i + 1) * Math.floor(5 + Math.random() * 25);
      const tradeSize = Math.floor(TRADE_SIZE_THRESHOLD + Math.random() * (vol24h / tradeCount));

      events.push({
        id: `${m.id}-${i}-${Date.now()}`,
        marketId: String(m.id),
        marketName: String(m.question ?? ""),
        marketSlug: String(m.slug ?? m.id),
        category: String(m.category ?? "General"),
        action,
        outcome,
        size: tradeSize,
        price: outcome === "YES" ? yesPrice : 100 - yesPrice,
        timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
        image: m.image ?? m.icon ?? null,
      });
    }
  }

  // Sort by timestamp descending (most recent first)
  return events.sort(
    (a, b) =>
      new Date((b as { timestamp: string }).timestamp).getTime() -
      new Date((a as { timestamp: string }).timestamp).getTime()
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  // If an address is given, try to fetch real user activity
  if (address) {
    try {
      const res = await fetch(`${DATA_API}/activity?user=${address}&limit=${limit}`, {
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ activity: Array.isArray(data) ? data : [], source: "user" });
      }
    } catch {
      // Fall through to market-based activity
    }
  }

  // Default: derive activity from top-volume markets
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?active=true&closed=false&limit=30&order=volume24hr&ascending=false`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
    const data = await res.json();
    const markets = Array.isArray(data) ? data : [];

    const activity = buildActivityFromMarkets(markets).slice(0, limit);
    return NextResponse.json({ activity, source: "markets" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
