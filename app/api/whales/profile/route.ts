import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || address.length < 10) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const [posRes, actRes, valRes] = await Promise.allSettled([
      fetch(`${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=50`, {
        next: { revalidate: 30 },
      }),
      fetch(`${DATA_API}/activity?user=${address}&limit=50`, {
        next: { revalidate: 30 },
      }),
      fetch(`${DATA_API}/value?user=${address}`, {
        next: { revalidate: 30 },
      }),
    ]);

    let positions: object[] = [];
    let activity: object[] = [];
    let portfolioValue = 0;

    if (posRes.status === "fulfilled" && posRes.value.ok) {
      const raw = await posRes.value.json();
      positions = (Array.isArray(raw) ? raw : [])
        // Only include positions with remaining shares (size > 0 means still open)
        .filter((p: Record<string, unknown>) => safeNum(p.size) > 0)
        .map((p: Record<string, unknown>) => ({
          conditionId: p.conditionId ?? p.market ?? "",
          market: p.market ?? "",
          question: p.title ?? p.question ?? "",
          outcome: p.outcome ?? "YES",
          outcomeIndex: p.outcomeIndex ?? 0,
          size: safeNum(p.size),
          avgPrice: safeNum(p.avgPrice),
          initialValue: safeNum(p.initialValue),
          currentValue: safeNum(p.currentValue),
          cashPnl: safeNum(p.cashPnl),
          percentPnl: safeNum(p.percentPnl),
          endDate: p.endDate ?? null,
          image: p.image ?? p.icon ?? null,
        }));
    }

    if (actRes.status === "fulfilled" && actRes.value.ok) {
      const raw = await actRes.value.json();
      activity = (Array.isArray(raw) ? raw : []).map((a: Record<string, unknown>) => ({
        id: a.id ?? String(Date.now() + Math.random()),
        type: a.type ?? "TRADE",
        conditionId: a.conditionId ?? "",
        title: a.title ?? a.question ?? "",
        side: a.side ?? "BUY",
        amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
        price: safeNum(a.price),
        outcome: a.outcome ?? "YES",
        timestamp: a.timestamp ?? new Date().toISOString(),
      }));
    }

    if (valRes.status === "fulfilled" && valRes.value.ok) {
      const raw = await valRes.value.json();
      const arr = Array.isArray(raw) ? raw : [];
      portfolioValue = safeNum(arr[0]?.value ?? 0);
    }

    return NextResponse.json({ address, portfolioValue, positions, activity });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
