import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arbitrage Opportunities",
  robots: { index: false, follow: false },
};

export default function ArbitrageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
