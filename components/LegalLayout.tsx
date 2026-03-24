import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LegalLayoutProps {
  children: React.ReactNode;
}

export function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container max-w-3xl flex h-14 items-center">
          <Link href="/">
            <Logo size="sm" showWordmark />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container max-w-3xl py-10 md:py-14">
          {children}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="container max-w-3xl py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} Polys. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-caption text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-caption text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-caption text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
