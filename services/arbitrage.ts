// Arbitrage detection: keyword matching + profit calculation
// Matches Polymarket markets against Kalshi events by title similarity

import type { FlatKalshiMarket } from "./kalshi";
import type { TransformedMarket } from "./polymarket";

export interface ArbitrageOpportunity {
  id: number;
  market: string;
  platform1: string; // higher YES price (overpriced side — buy NO here)
  platform2: string; // lower YES price (underpriced side — buy YES here)
  odds1: number; // YES price on platform1 as percentage
  odds2: number; // YES price on platform2 as percentage
  profit: number; // profit percentage on deployed capital
  capital: number; // total capital deployed (YES + NO spend)
  yesCost: number; // dollars spent buying YES on platform2
  noCost: number; // dollars spent buying NO on platform1
  expectedReturn: number; // guaranteed payout = capital + profit dollars
  timeDetected: string; // relative time since first seen
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
// Total capital to model for each opportunity (split across YES + NO legs)
const TARGET_CAPITAL = 1000;

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

// Compute position sizing for an arbitrage pair.
//
// Strategy: Buy YES on the underpriced platform (pLow) + Buy NO on the overpriced
// platform (pHigh). Both legs resolve to $q regardless of the outcome.
//
//   costPerUnit = pLow + (1 - pHigh)       [cost to place one unit on each leg]
//   q           = TARGET_CAPITAL / costPerUnit  [shares to place on each leg]
//   yesCost     = q * pLow                 [dollars for YES leg]
//   noCost      = q * (1 - pHigh)          [dollars for NO leg]
//   payout      = q                        [guaranteed return per unit = $1]
//   profit      = payout - TARGET_CAPITAL  [dollars above capital]
//   profitPct   = profit / TARGET_CAPITAL  [percentage return]
//
// This is equivalent to: profitPct = diff / (1 - diff) × 100
// where diff = pHigh - pLow.
//
// Returns null when spread is outside the [MIN_SPREAD, MAX_SPREAD] window.
function calcPosition(pLow: number, pHigh: number): {
  q: number;
  yesCost: number;
  noCost: number;
  payout: number;
  profitPct: number;
} | null {
  const diff = pHigh - pLow;
  if (diff < MIN_SPREAD || diff > MAX_SPREAD) return null;

  const costPerUnit = pLow + (1 - pHigh); // = 1 - diff
  const q = TARGET_CAPITAL / costPerUnit;
  const yesCost = q * pLow;
  const noCost = q * (1 - pHigh);
  const payout = q;
  const profitPct = ((payout - TARGET_CAPITAL) / TARGET_CAPITAL) * 100;

  return {
    q,
    yesCost: Math.round(yesCost),
    noCost: Math.round(noCost),
    payout: Math.round(payout),
    profitPct: Math.round(profitPct * 10) / 10,
  };
}

function relativeTime(firstSeen: Date): string {
  const diffMs = Date.now() - firstSeen.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.floor(diffMin / 60);
  return h === 1 ? "1 hr ago" : `${h} hrs ago`;
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// timestampCache is a module-level Map (keyed by pairKey) that persists across
// requests within the same server process. Pass the same map reference on every
// call so that first-seen timestamps survive refreshes.
export function detectArbitrage(
  polyMarkets: TransformedMarket[],
  kalshiMarkets: FlatKalshiMarket[],
  timestampCache: Map<string, Date>
): { opportunities: ArbitrageOpportunity[]; stats: ArbitrageStat[] } {
  const seen = new Set<string>(); // prevent duplicate pairs within a single run
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

    // Determine which side is cheaper (lower YES price) and which is pricier
    const polyIsHigher = polyYesFrac > kalshiYesFrac;
    const pLow = polyIsHigher ? kalshiYesFrac : polyYesFrac;
    const pHigh = polyIsHigher ? polyYesFrac : kalshiYesFrac;

    const pos = calcPosition(pLow, pHigh);
    if (pos === null) continue;

    // Record first-seen timestamp for this pair
    if (!timestampCache.has(pairKey)) {
      timestampCache.set(pairKey, new Date());
    }
    const firstSeen = timestampCache.get(pairKey)!;

    // platform1 = overpriced (buy NO here), platform2 = underpriced (buy YES here)
    const platform1 = polyIsHigher ? "Polymarket" : "Kalshi";
    const platform2 = polyIsHigher ? "Kalshi" : "Polymarket";
    const odds1 = Math.round(pHigh * 100);
    const odds2 = Math.round(pLow * 100);

    opportunities.push({
      id: opportunities.length + 1,
      market: kalshi.eventTitle,
      platform1,
      platform2,
      odds1,
      odds2,
      profit: pos.profitPct,
      capital: TARGET_CAPITAL,
      yesCost: pos.yesCost,
      noCost: pos.noCost,
      expectedReturn: pos.payout,
      timeDetected: relativeTime(firstSeen),
      status: pos.profitPct >= 3 ? "active" : "fading",
    });
  }

  // Sort by profit descending
  opportunities.sort((a, b) => b.profit - a.profit);
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
