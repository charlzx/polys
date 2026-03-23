import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchMarketById } from "@/services/polymarket";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");
  const mode = searchParams.get("mode") ?? "full";

  if (!marketId) {
    return NextResponse.json({ error: "marketId is required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI features require a GEMINI_API_KEY" }, { status: 503 });
  }

  // Fetch and transform market data using the polymarket service
  const market = await fetchMarketById(marketId);

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

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

    const result = await model.generateContent(prompt);
    const oneLiner = result.response.text().trim();
    return NextResponse.json({ oneLiner });
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
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate shape and provide defaults for any missing fields
    return NextResponse.json({
      sentiment: typeof parsed.sentiment === "string" ? parsed.sentiment : "Neutral",
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      priceMovementInsight: typeof parsed.priceMovementInsight === "string" ? parsed.priceMovementInsight : "",
      probabilityAssessment: typeof parsed.probabilityAssessment === "string" ? parsed.probabilityAssessment : "",
      oneLiner: typeof parsed.oneLiner === "string" ? parsed.oneLiner : "",
    });
  } catch (err) {
    console.error("Gemini market-summary parse error:", err);
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
