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

const suggestionsCache = new Map<string, CacheEntry<unknown[]>>();

function makeFingerprint(categories: string[], candidateIds: string[]): string {
  return `${[...categories].sort().join(",")}|${[...candidateIds].sort().join(",")}`;
}

function getCached(key: string): { data: unknown[]; stale: boolean } | null {
  const entry = suggestionsCache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) {
    suggestionsCache.delete(key);
    return null;
  }
  return { data: entry.data, stale: now > entry.staleAt };
}

function setCache(key: string, data: unknown[]): void {
  suggestionsCache.set(key, {
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

  let categories: string[] = [];
  let candidates: Array<{
    id: string;
    name: string;
    category: string;
    yesOdds: number;
    change24h: number;
  }> = [];

  try {
    const body = await req.json();
    categories = body.categories ?? [];
    candidates = body.candidates ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (candidates.length === 0) return NextResponse.json([]);

  const cacheKey = makeFingerprint(categories, candidates.map((c) => c.id));

  const cached = getCached(cacheKey);
  if (cached) {
    const headers: Record<string, string> = { "x-cache": cached.stale ? "stale" : "hit" };
    return NextResponse.json(cached.data, { headers });
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const candidateList = candidates
    .map(
      (m, i) =>
        `${i + 1}. [${m.id}] "${m.name}" — ${m.category}, YES: ${m.yesOdds}%, 24h: ${m.change24h >= 0 ? "+" : ""}${m.change24h}%`
    )
    .join("\n");

  const prompt = `A user is interested in prediction markets in these categories: ${categories.join(", ")}.

Here are markets they haven't seen yet:
${candidateList}

Recommend exactly 3 markets that would be most interesting for someone interested in ${categories.join(", ")}. Return a JSON array with exactly 3 objects:
- marketId: string (from the id in brackets)
- marketName: string
- category: string
- reason: string (one sentence, max 15 words, explaining why this is relevant for them)

Return ONLY valid JSON array, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const responseData = parsed.slice(0, 3);
    setCache(cacheKey, responseData);
    return NextResponse.json(responseData);
  } catch (err: unknown) {
    console.error("Gemini suggestions parse error:", err);
    const staleEntry = suggestionsCache.get(cacheKey);
    if (staleEntry) return NextResponse.json(staleEntry.data, { headers: { "x-cache": "stale-on-error" } });
    return NextResponse.json([]);
  }
}
