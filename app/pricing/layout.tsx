import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Get started free or upgrade to Pro for arbitrage scanning, AI market intelligence, and unlimited alerts.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Polys",
    description: "Simple, transparent pricing. Get started free or upgrade to Pro for arbitrage scanning, AI market intelligence, and unlimited alerts.",
    url: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
