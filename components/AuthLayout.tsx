import Link from "next/link";
import { features } from "@/data/features";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary/30 border-r border-border">
        <div className="flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo size="lg" showWordmark />
          </Link>

          {/* Headline + Features */}
          <div className="space-y-10">
            <div>
              <h1 className="text-display font-bold mb-3 leading-tight">
                Prediction market
                <br />
                intelligence.
              </h1>
              <p className="text-subtitle text-muted-foreground max-w-sm">
                Track odds, find arbitrage, and stay ahead across Polymarket and Kalshi.
              </p>
            </div>

            <div className="space-y-5">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <feature.icon className="h-4 w-4 text-primary" weight="bold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-body mb-0.5">{feature.title}</h3>
                    <p className="text-small text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <p className="text-caption text-muted-foreground">
            Polys &mdash; Real-time prediction market data
          </p>
        </div>
      </div>

      {/* Right Panel — Form area */}
      <div className="flex-1 flex flex-col lg:w-1/2">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 flex items-center px-4 border-b border-border">
          <Link href="/" className="flex items-center">
            <Logo size="sm" showWordmark />
          </Link>
        </header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
