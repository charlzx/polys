import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Polys team. We're here to help with any questions about prediction markets, your account, or the platform.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
