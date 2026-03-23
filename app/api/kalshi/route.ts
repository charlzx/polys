import { NextResponse } from "next/server";
import { fetchKalshiEventsServer } from "@/services/kalshi";

// GET /api/kalshi
// Returns a browsable list of active Kalshi markets from the events endpoint.
// Query params:
//   limit   - max markets to return (default 100, max 300)
//   category - filter by category slug (optional)
//   search  - keyword filter applied server-side (optional)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(Math.max(1, limitParam), 300);
  const categoryFilter = searchParams.get("category") ?? "";
  const searchFilter = (searchParams.get("search") ?? "").toLowerCase();

  const markets = await fetchKalshiEventsServer();

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

  const result = filtered.slice(0, limit);

  return NextResponse.json({ markets: result, total: result.length });
}
