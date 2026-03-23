import { NextRequest, NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

// Next.js 15 App Router: dynamic route params are a Promise
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`${GAMMA_API}/markets/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gamma API responded with ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("Gamma API proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch market" }, { status: 502 });
  }
}
