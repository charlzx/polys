import { NextRequest, NextResponse } from "next/server";

const GAMMA_API = "https://gamma-api.polymarket.com";

const CATEGORY_KEYWORDS: Record<string, string> = {
  crypto: "Crypto",
  bitcoin: "Crypto",
  ethereum: "Crypto",
  solana: "Crypto",
  defi: "Crypto",
  nft: "Crypto",
  politics: "Politics",
  election: "Politics",
  president: "Politics",
  congress: "Politics",
  senate: "Politics",
  democrat: "Politics",
  republican: "Politics",
  sport: "Sports",
  nba: "Sports",
  nfl: "Sports",
  mlb: "Sports",
  nhl: "Sports",
  soccer: "Sports",
  football: "Sports",
  basketball: "Sports",
  tennis: "Sports",
  economy: "Economics",
  economics: "Economics",
  inflation: "Economics",
  recession: "Economics",
  fed: "Economics",
  tech: "Tech",
  technology: "Tech",
  ai: "Tech",
  openai: "Tech",
  apple: "Tech",
  google: "Tech",
  microsoft: "Tech",
  nvidia: "Tech",
  spacex: "Tech",
  entertainment: "Entertainment",
  movie: "Entertainment",
  oscar: "Entertainment",
  music: "Entertainment",
  grammy: "Entertainment",
};

const SPORTS_TICKER_PREFIXES = [
  "cbb-", "nba-", "nfl-", "mlb-", "nhl-", "cfb-", "mls-", "ucl-", "epl-",
  "fifa-", "wc-", "soccer-", "tennis-", "golf-", "f1-", "boxing-", "ufc-",
  "ncaa-", "ncaab-", "nfl-draft-", "super-bowl-",
];

function normalizeCategory(raw: Record<string, unknown>): string {
  const events = (raw.events as Array<{ title?: string; slug?: string; ticker?: string; category?: string }>) ?? [];
  for (const event of events) {
    const ticker = (event.ticker ?? event.slug ?? "").toLowerCase();
    if (SPORTS_TICKER_PREFIXES.some((pfx) => ticker.startsWith(pfx))) return "Sports";
    if (event.category) {
      const ec = event.category.toLowerCase();
      for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
        if (ec.includes(kw)) return cat;
      }
    }
  }

  const category = String(raw.category ?? "").toLowerCase();
  if (category) {
    for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (category.includes(kw)) return cat;
    }
  }

  const tags = (raw.tags as Array<{ label: string }>) ?? [];
  for (const tag of tags) {
    const label = tag.label.toLowerCase();
    for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
      if (label.includes(kw)) return cat;
    }
  }

  return "General";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);
  const category = searchParams.get("category");

  const url = new URL(`${GAMMA_API}/markets`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  if (category) url.searchParams.set("tag_slug", category);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gamma API responded with ${res.status}` },
        { status: res.status }
      );
    }

    const rawMarkets = await res.json();
    if (!Array.isArray(rawMarkets)) {
      return NextResponse.json([], { status: 200 });
    }

    const newsItems = rawMarkets.map((m: Record<string, unknown>) => {
      let yesOdds = 50;
      try {
        const prices = JSON.parse(String(m.outcomePrices ?? "[]"));
        if (Array.isArray(prices) && prices.length >= 2) {
          const yes = parseFloat(prices[0]);
          if (!isNaN(yes)) yesOdds = Math.round(yes * 1000) / 10;
        }
      } catch { /* ignore */ }

      let change24h = 0;
      const rawChange = m.oneDayPriceChange;
      if (rawChange !== undefined && rawChange !== null) {
        const parsed = parseFloat(String(rawChange));
        if (!isNaN(parsed)) change24h = parseFloat((parsed * 100).toFixed(1));
      }

      const formatDollar = (v: unknown): string => {
        const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
        if (isNaN(n) || n === 0) return "$0";
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
        return `$${n.toFixed(0)}`;
      };

      const volumeRaw = (m.volumeNum as number | undefined) ?? m.volume;
      const volume24hRaw = m.volume24hr;

      return {
        id: String(m.id ?? ""),
        slug: String(m.slug ?? m.id ?? ""),
        question: String(m.question ?? "Unknown Market"),
        description: String(m.description ?? ""),
        image: (m.image || m.icon) as string | undefined,
        yesOdds,
        change24h,
        volume: formatDollar(volumeRaw),
        volume24h: formatDollar(volume24hRaw),
        category: normalizeCategory(m),
        tags: Array.isArray(m.tags)
          ? (m.tags as Array<{ label: string }>).map((t) => t.label)
          : [],
        endDate: String(m.endDateIso ?? (typeof m.endDate === "string" ? m.endDate.split("T")[0] : "")),
        active: m.active !== false && !m.closed,
      };
    });

    return NextResponse.json(newsItems, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("News API proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 502 });
  }
}
