import { NextResponse } from "next/server";

const CLOB_BASE = "https://clob.polymarket.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("token_id");

  if (!tokenId) {
    return NextResponse.json({ error: "token_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `CLOB responded ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
