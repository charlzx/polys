import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { label: "Markets", href: "/markets" },
  { label: "Analytics", href: "/dashboard" },
  { label: "Arbitrage", href: "/arbitrage" },
  { label: "Pricing", href: "/pricing" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container py-4">
        {/* Strip: two rows on mobile, single row on sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
          {/* Row 1 on mobile: logo + tagline (left) and theme toggle (right) */}
          <div className="flex items-center justify-between sm:flex-1">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-subtitle font-bold">
                Polys
              </Link>
              <span className="text-small text-muted-foreground">
                — Prediction market intelligence
              </span>
            </div>
            <div className="sm:hidden">
              <ThemeToggle variant="full" />
            </div>
          </div>

          {/* Row 2 on mobile: centered nav links */}
          <nav className="flex items-center justify-center gap-5 sm:flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-small text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Theme toggle on right — only visible sm+ */}
          <div className="hidden sm:flex sm:flex-1 sm:justify-end">
            <ThemeToggle variant="full" />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-caption text-muted-foreground text-center sm:text-left">
            {currentYear} Polys. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
