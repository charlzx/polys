import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Polys terms of service — your rights and responsibilities when using the platform.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
