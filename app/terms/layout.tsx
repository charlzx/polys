import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Polys terms of service — your rights and responsibilities when using the platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Polys",
    description: "Polys terms of service — your rights and responsibilities when using the platform.",
    url: "/terms",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
