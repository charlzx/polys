import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "@/lib/ai-auth";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GAMMA_API = "https://gamma-api.polymarket.com";

// Parse Gamma market fields into a clean prompt-ready shape
function extractMarketFields(raw: Record<string, unknown>) {
  // Parse yes/no odds from outcomePrices
  let yesOdds = 50;
  let noOdds = 50;
  try {
    const prices = JSON.parse(String(raw.outcomePrices ?? "[]"));
    if (Array.isArray(prices) && prices.length >= 2) {
      const yes = parseFloat(prices[0]);
      const no = parseFloat(prices[1]);
      if (!isNaN(yes) && !isNaN(no)) {
        yesOdds = Math.round(yes * 1000) / 10;
        noOdds = Math.round(no * 1000) / 10;
      }
    }
  } catch { /* ignore */ }

  // Parse 24h change
  let change24h = 0;
  const rawChange = raw.oneDayPriceChange;
  if (rawChange !== undefined && rawChange !== null) {
    const parsed = parseFloat(String(rawChange));
    if (!isNaN(parsed)) change24h = parseFloat((parsed * 100).toFixed(1));
  }

  // Format volume/liquidity
  const formatDollar = (v: unknown): string => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
    if (isNaN(n) || n === 0) return "$0";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const volumeRaw = (raw.volumeNum as number | undefined) ?? raw.volume;
  const liquidityRaw = (raw.liquidityNum as number | undefined) ?? raw.liquidity;

  return {
    name: String(raw.question ?? raw.name ?? "Unknown Market"),
    category: String(raw.category ?? "General"),
    description: String(raw.description ?? ""),
    yesOdds,
    noOdds,
    change24h,
    volume: formatDollar(volumeRaw),
    liquidity: formatDollar(liquidityRaw),
    endDate: String(raw.endDateIso ?? (typeof raw.endDate === "string" ? raw.endDate.split("T")[0] : "")),
  };
}

async function fetchMarketFromGamma(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${GAMMA_API}/markets/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.id) return data;
    }
  } catch { /* fall through */ }

  // Fallback: query by conditionId if hex
  if (id.startsWith("0x")) {
    try {
      const res = await fetch(`${GAMMA_API}/markets?conditionId=${id}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data[0];
      }
    } catch { /* ignore */ }
  }

  return null;
}

export async function GET(req: NextRequest) {
  // Require authenticated session
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");
  const mode = searchParams.get("mode") ?? "full";

  if (!marketId) {
    return NextResponse.json({ error: "marketId is required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI features require a GEMINI_API_KEY" }, { status: 503 });
  }

  // Fetch raw market data directly from Gamma API (avoids relative URL issues in server context)
  const rawMarket = await fetchMarketFromGamma(marketId);

  if (!rawMarket) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  const market = extractMarketFields(rawMarket);

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const marketInfo = `
Market: ${market.name}
Category: ${market.category}
Current YES odds: ${market.yesOdds}%
Current NO odds: ${market.noOdds}%
24h price change: ${market.change24h >= 0 ? "+" : ""}${market.change24h}%
Volume: ${market.volume}
Liquidity: ${market.liquidity}
End date: ${market.endDate || "Unknown"}
${market.description ? `Description: ${market.description}` : ""}
`.trim();

  if (mode === "oneliner") {
    const prompt = `You are a concise prediction market analyst. Given this market data, write exactly ONE sentence (max 15 words) describing the most notable thing happening. Be specific and data-driven. No fluff.

${marketInfo}

Respond with just the one sentence, no quotes, no formatting.`;

    try {
      const result = await model.generateContent(prompt);
      const oneLiner = result.response.text().trim();
      return NextResponse.json({ oneLiner });
    } catch (err) {
      console.error("Gemini oneliner error:", err);
      return NextResponse.json({ oneLiner: "" });
    }
  }

  const prompt = `You are an expert prediction market analyst. Analyze this prediction market and return a JSON object with exactly these fields:
- sentiment: string (one of: "Bullish", "Bearish", "Neutral", "Highly Bullish", "Highly Bearish")
- riskFactors: string[] (2-3 specific risk factors, each under 12 words)
- priceMovementInsight: string (1-2 sentences explaining what the recent price movement suggests)
- probabilityAssessment: string (1-2 sentences with a calibrated assessment of the true probability)
- oneLiner: string (one sentence max 15 words summarizing the most notable thing)

Market data:
${marketInfo}

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code fences, then extract the first JSON object
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const match = stripped.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1] : stripped;
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    return NextResponse.json({
      sentiment: typeof parsed.sentiment === "string" ? parsed.sentiment : "Neutral",
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      priceMovementInsight: typeof parsed.priceMovementInsight === "string" ? parsed.priceMovementInsight : "",
      probabilityAssessment: typeof parsed.probabilityAssessment === "string" ? parsed.probabilityAssessment : "",
      oneLiner: typeof parsed.oneLiner === "string" ? parsed.oneLiner : "",
    });
  } catch (err) {
    console.error("Gemini market-summary parse error:", err);
    return NextResponse.json({
      sentiment: "Neutral",
      riskFactors: [],
      priceMovementInsight: "",
      probabilityAssessment: "",
      oneLiner: "",
    });
  }
}
