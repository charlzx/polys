// Arbitrage detection: keyword matching + profit calculation
// Matches Polymarket markets against Kalshi events by title similarity

import type { FlatKalshiMarket } from "./kalshi";
import type { TransformedMarket } from "./polymarket";

export interface ArbitrageOpportunity {
  id: number;
  market: string;
  platform1: string; // higher YES price (overpriced side — sell YES here)
  platform2: string; // lower YES price (underpriced side — buy YES here)
  odds1: number; // YES price on platform1 as percentage
  odds2: number; // YES price on platform2 as percentage
  profit: number; // profit percentage
  capital: number; // display capital in USD
  expectedReturn: number; // capital + profit dollars
  timeDetected: string;
  status: "active" | "fading" | "expired";
}

export interface ArbitrageStat {
  label: string;
  value: string;
}

// Minimum spread (in probability units, 0–1) to flag as an opportunity
const MIN_SPREAD = 0.03;
// Maximum spread — larger gaps usually signal a bad keyword match, not real arb
const MAX_SPREAD = 0.15;
// Jaccard similarity threshold for market title matching
const MATCH_THRESHOLD = 0.18;
// Display capital for return calculations
const DEFAULT_CAPITAL = 1000;

const STOP_WORDS = new Set([
  "will","a","an","the","in","of","to","be","is","are","for","by","at",
  "on","from","do","does","did","has","have","had","was","were","or","and",
  "not","before","after","when","than","if","that","this","which","s","its",
  "it","as","can","could","would","should","may","might","over","under",
  "into","who","what","how","there","their","they","more","most","first",
  "next","last","new","no","yes","ever","about","back","up","down","out",
  "us","our","any","all","so","but","also","than","just","then","here",
  "between","among","within","without","across","per","via","vs",
]);

// Synonym groups — any word in a group maps to the canonical (first) form
const SYNONYM_GROUPS: string[][] = [
  ["bitcoin", "btc"],
  ["ethereum", "eth"],
  ["openai", "chatgpt", "gpt"],
  ["president", "potus", "presidential"],
  ["federal", "fed"],
  ["elon", "musk"],
  ["mars", "martian"],
  ["recession", "downturn"],
  ["anthropic", "claude"],
];

function canonicalize(word: string): string {
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(word)) return group[0];
  }
  return word;
}

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .map(canonicalize);
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

// Arbitrage profit % for two YES prices (both in 0–1 range)
// Returns null if spread is too small or too large (large gaps = likely bad match)
function arbitrageProfitPct(p1: number, p2: number): number | null {
  const diff = Math.abs(p1 - p2);
  if (diff < MIN_SPREAD) return null;
  if (diff > MAX_SPREAD) return null;
  // Cost = cheaper_yes + (1 - pricier_yes) = 1 - diff
  const cost = 1 - diff;
  const profitPct = (diff / cost) * 100;
  return Math.round(profitPct * 10) / 10;
}

function relativeTime(detectedAt: Date): string {
  const diffMs = Date.now() - detectedAt.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function detectArbitrage(
  polyMarkets: TransformedMarket[],
  kalshiMarkets: FlatKalshiMarket[],
  detectedAt: Date = new Date()
): { opportunities: ArbitrageOpportunity[]; stats: ArbitrageStat[] } {
  const timeStr = relativeTime(detectedAt);
  const seen = new Set<string>(); // prevent duplicate pairs
  const opportunities: ArbitrageOpportunity[] = [];

  for (const kalshi of kalshiMarkets) {
    const kTokens = tokenize(kalshi.eventTitle);
    let bestScore = MATCH_THRESHOLD;
    let bestPoly: TransformedMarket | null = null;

    for (const poly of polyMarkets) {
      const pTokens = tokenize(poly.name);
      const score = jaccardSimilarity(kTokens, pTokens);
      if (score > bestScore) {
        bestScore = score;
        bestPoly = poly;
      }
    }

    if (!bestPoly) continue;

    const pairKey = `${bestPoly.id}:${kalshi.ticker}`;
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    const polyYesFrac = bestPoly.yesOdds / 100;
    const kalshiYesFrac = kalshi.yesMid;

    const profitPct = arbitrageProfitPct(polyYesFrac, kalshiYesFrac);
    if (profitPct === null) continue;

    // Determine which side is over/underpriced
    const polyIsHigher = polyYesFrac > kalshiYesFrac;
    const platform1 = polyIsHigher ? "Polymarket" : "Kalshi";
    const platform2 = polyIsHigher ? "Kalshi" : "Polymarket";
    const odds1 = polyIsHigher
      ? Math.round(polyYesFrac * 100)
      : Math.round(kalshiYesFrac * 100);
    const odds2 = polyIsHigher
      ? Math.round(kalshiYesFrac * 100)
      : Math.round(polyYesFrac * 100);

    const expectedReturn = Math.round(DEFAULT_CAPITAL * (1 + profitPct / 100));

    opportunities.push({
      id: opportunities.length + 1,
      market: kalshi.eventTitle,
      platform1,
      platform2,
      odds1,
      odds2,
      profit: profitPct,
      capital: DEFAULT_CAPITAL,
      expectedReturn,
      timeDetected: timeStr,
      status: profitPct >= 3 ? "active" : "fading",
    });
  }

  // Sort by profit descending
  opportunities.sort((a, b) => b.profit - a.profit);

  // Re-number IDs after sort
  opportunities.forEach((o, i) => { o.id = i + 1; });

  // Compute stats
  const count = opportunities.length;
  const avgProfit =
    count > 0
      ? (opportunities.reduce((s, o) => s + o.profit, 0) / count).toFixed(1) + "%"
      : "0%";
  const totalValue =
    count > 0
      ? formatMoney(opportunities.reduce((s, o) => s + (o.expectedReturn - o.capital), 0))
      : "$0";

  const stats: ArbitrageStat[] = [
    { label: "Opportunities Found", value: String(count) },
    { label: "Average Profit", value: avgProfit },
    { label: "Total Value Detected", value: totalValue },
  ];

  return { opportunities, stats };
}
