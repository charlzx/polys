import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "@/lib/ai-auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

const intelligenceCache = new Map<string, CacheEntry<unknown[]>>();

function makeFingerprint(marketIds: string[]): string {
  return [...marketIds].sort().join(",");
}

function getCached(key: string): { data: unknown[]; stale: boolean } | null {
  const entry = intelligenceCache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) {
    intelligenceCache.delete(key);
    return null;
  }
  return { data: entry.data, stale: now > entry.staleAt };
}

function setCache(key: string, data: unknown[]): void {
  intelligenceCache.set(key, {
    data,
    staleAt: Date.now() + CACHE_TTL_MS,
    expiresAt: Date.now() + CACHE_TTL_MS * 2,
  });
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI features require a GEMINI_API_KEY" }, { status: 503 });
  }

  let markets: Array<{
    id: string;
    name: string;
    category: string;
    yesOdds: number;
    change24h: number;
    volume: string;
  }> = [];

  try {
    const body = await req.json();
    markets = body.markets ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (markets.length === 0) {
    return NextResponse.json([]);
  }

  const cacheKey = makeFingerprint(markets.map((m) => m.id));

  const cached = getCached(cacheKey);
  if (cached) {
    const headers: Record<string, string> = { "x-cache": cached.stale ? "stale" : "hit" };
    return NextResponse.json(cached.data, { headers });
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const marketList = markets
    .map(
      (m, i) =>
        `${i + 1}. [${m.id}] "${m.name}" — Category: ${m.category}, YES: ${m.yesOdds}%, 24h change: ${m.change24h >= 0 ? "+" : ""}${m.change24h}%, Volume: ${m.volume}`
    )
    .join("\n");

  const prompt = `You are a prediction market intelligence analyst. Given these live markets, identify the TOP 3 most notable opportunities or significant movements worth flagging.

Markets:
${marketList}

Return a JSON array with exactly 3 objects (pick the 3 most interesting), each with:
- marketId: string (from the id in brackets)
- marketName: string
- category: string
- insight: string (one punchy sentence, max 18 words, about what makes this market notable right now)
- signal: "bullish" | "bearish" | "neutral"
- magnitude: "high" | "medium" | "low"

Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const match = stripped.match(/(\[[\s\S]*\])/);
    const jsonStr = match ? match[1] : stripped;
    const parsed: unknown[] = JSON.parse(jsonStr);
    const validated = (Array.isArray(parsed) ? parsed : []).map((item) => {
      const i = item as Record<string, unknown>;
      return {
        marketId: typeof i.marketId === "string" ? i.marketId : "",
        marketName: typeof i.marketName === "string" ? i.marketName : "",
        category: typeof i.category === "string" ? i.category : "",
        insight: typeof i.insight === "string" ? i.insight : "",
        signal: (["bullish", "bearish", "neutral"] as const).includes(i.signal as "bullish" | "bearish" | "neutral")
          ? (i.signal as "bullish" | "bearish" | "neutral")
          : "neutral",
        magnitude: (["high", "medium", "low"] as const).includes(i.magnitude as "high" | "medium" | "low")
          ? (i.magnitude as "high" | "medium" | "low")
          : "medium",
      };
    }).filter((i) => i.marketId && i.marketName);
    setCache(cacheKey, validated);
    return NextResponse.json(validated);
  } catch (err: unknown) {
    console.error("Gemini intelligence parse error:", err);
    const staleEntry = intelligenceCache.get(cacheKey);
    if (staleEntry) return NextResponse.json(staleEntry.data, { headers: { "x-cache": "stale-on-error" } });
    return NextResponse.json([]);
  }
}
