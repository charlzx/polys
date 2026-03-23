import { NextResponse } from "next/server";
import { fetchKalshiEventsServer } from "@/services/kalshi";

// GET /api/kalshi
// Returns a browsable list of active Kalshi markets from the events endpoint.
// Query params:
//   limit    - max markets to return (default 200, max 300)
//   category - filter by category slug (optional)
//   search   - keyword filter applied server-side (optional)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "200", 10);
  const limit = Math.min(Math.max(1, limitParam), 300);
  const categoryFilter = searchParams.get("category") ?? "";
  const searchFilter = (searchParams.get("search") ?? "").toLowerCase();

  let markets;
  try {
    markets = await fetchKalshiEventsServer();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch Kalshi markets", markets: [], total: 0, filteredTotal: 0 },
      { status: 502 }
    );
  }

  let filtered = markets;

  if (categoryFilter && categoryFilter !== "All") {
    filtered = filtered.filter(
      (m) => m.eventCategory.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  if (searchFilter) {
    filtered = filtered.filter(
      (m) =>
        m.eventTitle.toLowerCase().includes(searchFilter) ||
        m.marketTitle.toLowerCase().includes(searchFilter)
    );
  }

  // filteredTotal is the count before limit — useful for future server-side pagination
  const filteredTotal = filtered.length;
  const result = filtered.slice(0, limit);

  return NextResponse.json({ markets: result, total: markets.length, filteredTotal });
}
