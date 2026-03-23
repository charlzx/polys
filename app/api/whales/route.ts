import { NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  try {
    const res = await fetch(
      `${GAMMA_API}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);

    const data = await res.json();
    const markets = Array.isArray(data) ? data : [];

    const whaleMarkets = markets
      .filter((m: Record<string, unknown>) => safeNum(m.volume24hr) > 0)
      .map((m: Record<string, unknown>) => {
        let yesPrice = 0;
        let noPrice = 0;
        try {
          const prices = JSON.parse(String(m.outcomePrices ?? "[]"));
          yesPrice = Math.round(safeNum(prices[0]) * 100);
          noPrice = Math.round(safeNum(prices[1]) * 100);
        } catch {
          yesPrice = Math.round(safeNum(m.lastTradePrice) * 100);
          noPrice = 100 - yesPrice;
        }

        const vol24h = safeNum(m.volume24hr);
        const totalVol = safeNum(m.volumeNum ?? m.volume);
        const change = Math.round(safeNum(m.oneDayPriceChange) * 100 * 10) / 10;
        const liq = safeNum(m.liquidityNum ?? m.liquidity);

        return {
          id: String(m.id),
          slug: String(m.slug ?? m.id),
          name: String(m.question ?? ""),
          category: String(m.category ?? "General"),
          volume24h: vol24h,
          totalVolume: totalVol,
          yesPrice,
          noPrice,
          priceChange24h: change,
          liquidity: liq,
          image: m.image ? String(m.image) : m.icon ? String(m.icon) : null,
          endDate: m.endDateIso ? String(m.endDateIso) : m.endDate ? String(m.endDate) : null,
          lastActivity: new Date().toISOString(),
        };
      });

    type WhaleMarket = typeof whaleMarkets[0];
    const totalVolume24h = whaleMarkets.reduce((s, m: WhaleMarket) => s + m.volume24h, 0);
    const totalLiquidity = whaleMarkets.reduce((s, m: WhaleMarket) => s + m.liquidity, 0);
    const largestMove = whaleMarkets.reduce(
      (best: { market: string; change: number } | null, m: WhaleMarket) =>
        best === null || Math.abs(m.priceChange24h) > Math.abs(best.change)
          ? { market: m.name, change: m.priceChange24h }
          : best,
      null
    );

    return NextResponse.json({ markets: whaleMarkets, totalVolume24h, totalLiquidity, largestMove });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
