import { NextRequest, NextResponse } from "next/server";

const GUARDIAN_ENDPOINT = "https://content.guardianapis.com/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ articles: [] });
  }

  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const sp = new URLSearchParams({
      q: q.trim(),
      "api-key": apiKey,
      "page-size": "5",
      "show-fields": "thumbnail,trailText",
      "order-by": "relevance",
    });

    const res = await fetch(`${GUARDIAN_ENDPOINT}?${sp.toString()}`, {
      next: { revalidate: 900 }, // 15 min server-side cache
    });

    if (!res.ok) {
      console.error("Guardian API error:", res.status, await res.text());
      return NextResponse.json({ articles: [] });
    }

    const data = await res.json();
    const results = data?.response?.results ?? [];

    const articles = results.map((item: {
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      sectionName: string;
      fields?: { thumbnail?: string };
    }) => ({
      title: item.webTitle,
      url: item.webUrl,
      publishedAt: item.webPublicationDate,
      section: item.sectionName,
      thumbnail: item.fields?.thumbnail ?? null,
    }));

    return NextResponse.json({ articles }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    console.error("Guardian proxy error:", err);
    return NextResponse.json({ articles: [] });
  }
}
