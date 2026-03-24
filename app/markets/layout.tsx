import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Prediction Markets",
  description: "Browse real-time prediction markets across Polymarket and Kalshi. Track odds on politics, crypto, sports, and more.",
};

export default function MarketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
