import { NextRequest, NextResponse } from "next/server";

interface RedditToken {
  access_token: string;
  expires_at: number;
}

// In-memory token cache (per process)
let cachedToken: RedditToken | null = null;

async function getRedditToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Polys/1.0 (prediction market intelligence)",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.error("Reddit OAuth error:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.access_token) return null;

    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    return cachedToken.access_token;
  } catch (err) {
    console.error("Reddit token fetch error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ posts: [] });
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ posts: [] });
  }

  const token = await getRedditToken(clientId, clientSecret);
  if (!token) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const sp = new URLSearchParams({
      q: q.trim(),
      sort: "relevance",
      limit: "5",
      type: "link",
      t: "month",
    });

    const res = await fetch(`https://oauth.reddit.com/search?${sp.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Polys/1.0 (prediction market intelligence)",
      },
    });

    if (!res.ok) {
      // Token may have been invalidated — clear cache
      if (res.status === 401) cachedToken = null;
      console.error("Reddit search error:", res.status);
      return NextResponse.json({ posts: [] });
    }

    const data = await res.json();
    const children = data?.data?.children ?? [];

    const posts = children
      .map((child: {
        data: {
          title: string;
          url: string;
          subreddit: string;
          score: number;
          num_comments: number;
          permalink: string;
          is_self: boolean;
          selftext?: string;
        };
      }) => ({
        title: child.data.title,
        url: `https://www.reddit.com${child.data.permalink}`,
        subreddit: child.data.subreddit,
        score: child.data.score,
        numComments: child.data.num_comments,
      }))
      .slice(0, 3);

    return NextResponse.json({ posts }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    console.error("Reddit proxy error:", err);
    return NextResponse.json({ posts: [] });
  }
}
