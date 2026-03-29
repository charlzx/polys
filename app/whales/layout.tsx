import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whale Tracker",
  description: "Track large prediction market trades in real-time. See which wallets are moving big money across Polymarket and Kalshi.",
  robots: { index: false, follow: false },
};

export default function WhalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
