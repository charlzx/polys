import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
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
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Gemini intelligence parse error:", err);
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
