import { NextRequest, NextResponse } from "next/server";

const CLOB_API = "https://clob.polymarket.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market");
  const interval = searchParams.get("interval") ?? "1m";
  const fidelity = searchParams.get("fidelity") ?? "60";

  if (!market) {
    return NextResponse.json({ error: "market parameter is required" }, { status: 400 });
  }

  const url = new URL(`${CLOB_API}/prices-history`);
  url.searchParams.set("market", market);
  url.searchParams.set("interval", interval);
  url.searchParams.set("fidelity", fidelity);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CLOB API responded with ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("CLOB API proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch price history" }, { status: 502 });
  }
}
