import type { TransformedMarket } from "@/services/polymarket";
import type { FlatKalshiMarket } from "@/services/kalshi";

export type MarketSource = "polymarket" | "kalshi";

export interface UnifiedMarket {
  id: string;
  name: string;
  category: string;
  yesOdds: number;
  noOdds: number;
  change24h: number;
  volume: string;
  volume24h: string;
  volumeRaw: number;
  liquidity: string;
  endDate: string;
  image?: string;
  source: MarketSource;
  externalUrl?: string;
  yesTokenId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economics: "Economics",
  crypto: "Crypto",
  finance: "Finance",
  sports: "Sports",
  science: "Science",
  technology: "Technology",
  health: "Health",
  culture: "Culture",
  weather: "Weather",
  entertainment: "Entertainment",
  geopolitics: "Geopolitics",
  international: "International",
};

function kalshiCategoryLabel(raw: string): string {
  if (!raw) return "Other";
  return CATEGORY_LABELS[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function formatVolume(raw: number): string {
  if (raw <= 0) return "—";
  if (raw >= 1_000_000) return `$${(raw / 1_000_000).toFixed(1)}M`;
  if (raw >= 1_000) return `$${(raw / 1_000).toFixed(1)}K`;
  return `$${raw.toFixed(0)}`;
}

function parseDollarString(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, "").toUpperCase();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (cleaned.endsWith("B")) return num * 1_000_000_000;
  if (cleaned.endsWith("M")) return num * 1_000_000;
  if (cleaned.endsWith("K")) return num * 1_000;
  return num;
}

export function polymarketToUnified(m: TransformedMarket): UnifiedMarket {
  const volumeRaw =
    typeof m.volume24h === "string" && m.volume24h
      ? parseDollarString(m.volume24h)
      : typeof m.volume === "string" && m.volume
      ? parseDollarString(m.volume)
      : 0;

  return {
    id: m.id,
    name: m.name,
    category: m.category,
    yesOdds: m.yesOdds,
    noOdds: m.noOdds,
    change24h: m.change24h,
    volume: m.volume,
    volume24h: m.volume24h ?? "—",
    volumeRaw,
    liquidity: m.liquidity ?? "—",
    endDate: m.endDate ?? "",
    image: m.image,
    source: "polymarket",
    yesTokenId: m.yesTokenId,
  };
}

export function kalshiToUnified(m: FlatKalshiMarket): UnifiedMarket {
  const yesOdds = Math.round(m.yesMid * 100);
  const noOdds = 100 - yesOdds;
  const volumeRaw = m.volumeFp ?? 0;

  return {
    id: `kalshi-${m.ticker}`,
    name: m.eventTitle || m.marketTitle,
    category: kalshiCategoryLabel(m.eventCategory),
    yesOdds,
    noOdds,
    change24h: m.change24h ?? 0,
    volume: formatVolume(volumeRaw),
    volume24h: formatVolume(volumeRaw),
    volumeRaw,
    liquidity: "—",
    endDate: m.closeTime ? m.closeTime.split("T")[0] : "",
    source: "kalshi",
    externalUrl: m.externalUrl,
  };
}
