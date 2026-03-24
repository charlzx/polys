import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

const productLinks = [
  { label: "Markets", href: "/markets" },
  { label: "Analytics", href: "/dashboard" },
  { label: "Arbitrage", href: "/arbitrage" },
  { label: "Pricing", href: "/pricing" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container py-10 md:py-12">
        {/* Three-column grid on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center">
              <Logo size="sm" showWordmark />
            </Link>
            <p className="text-small text-muted-foreground max-w-xs">
              Real-time prediction market intelligence across Polymarket and Kalshi.
            </p>
            <div className="mt-auto pt-2">
              <ThemeToggle variant="full" />
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-small font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-small text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-small font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-small text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright strip */}
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-caption text-muted-foreground">
            &copy; {currentYear} Polys. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
