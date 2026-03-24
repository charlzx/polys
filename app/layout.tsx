import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/CookieBanner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://polys.replit.app";

export const metadata: Metadata = {
  title: {
    template: "%s | Polys",
    default: "Polys — Prediction Market Intelligence",
  },
  description: "Track real-time odds, detect cross-platform arbitrage, and analyze market sentiment across Polymarket and Kalshi. All in one place.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    siteName: "Polys",
    title: "Polys — Prediction Market Intelligence",
    description: "Track real-time odds, detect cross-platform arbitrage, and analyze market sentiment across Polymarket and Kalshi.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Polys — Prediction Market Intelligence",
    description: "Track real-time odds, detect cross-platform arbitrage, and analyze market sentiment across Polymarket and Kalshi.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
