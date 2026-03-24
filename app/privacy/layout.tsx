import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Polys privacy policy — how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Polys",
    description: "Polys privacy policy — how we collect, use, and protect your data.",
    url: "/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
