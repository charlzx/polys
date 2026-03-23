import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../components/providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    template: "%s | Polys",
    default: "Polys - Prediction Market Intelligence",
  },
  description: "Track odds, detect arbitrage opportunities, and analyze market sentiment across Polymarket, Kalshi, and more. All in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
