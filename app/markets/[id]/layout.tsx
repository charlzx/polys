import type { Metadata } from "next";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface GammaMarket {
  id: string;
  question?: string;
  description?: string;
  outcomePrices?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${GAMMA_API}/markets/${id}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const market: GammaMarket = await res.json();
      const question = market.question ?? "Market Details";

      let yesOdds: number | null = null;
      try {
        if (market.outcomePrices) {
          const prices = JSON.parse(market.outcomePrices) as string[];
          yesOdds = Math.round(parseFloat(prices[0]) * 100);
        }
      } catch {
        // ignore parse failure
      }

      const description = yesOdds !== null
        ? `Current odds: ${yesOdds}% Yes. Track live prediction market data, volume, and analysis on Polys.`
        : `View live odds and prediction market data for this market. Track outcomes, volume, and analysis on Polys.`;

      return {
        title: question,
        description,
        alternates: { canonical: `/markets/${id}` },
        openGraph: {
          title: `${question} | Polys`,
          description,
          url: `/markets/${id}`,
          type: "website",
        },
        twitter: {
          card: "summary",
          title: `${question} | Polys`,
          description,
        },
      };
    }
  } catch {
    // fall through to default
  }

  return {
    title: "Market Details",
    description: "View live prediction market odds, volume, and analysis on Polys.",
    alternates: { canonical: `/markets/${id}` },
  };
}

export default function MarketDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
