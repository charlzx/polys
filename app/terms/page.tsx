import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  const updated = "March 24, 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 pt-[120px] md:pt-[88px] pb-20 md:pb-0">
        <div className="container max-w-3xl py-10 md:py-14">
          <div className="mb-10">
            <h1 className="text-display font-bold mb-2">Terms of Service</h1>
            <p className="text-small text-muted-foreground">Last updated: {updated}</p>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-body">

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">1. Acceptance of terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Polys, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, do not use the service. These terms
                apply to all visitors, users, and registered accounts.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">2. Description of service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Polys provides real-time data aggregation, analysis, and intelligence tools
                for prediction markets including Polymarket and Kalshi. The service includes
                market odds tracking, arbitrage detection, whale wallet monitoring, and
                AI-assisted market summaries. All data is sourced from public APIs and
                on-chain records.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">3. Not financial advice</h2>
              <p className="text-muted-foreground leading-relaxed">
                Polys provides informational tools only. Nothing on Polys constitutes
                financial, investment, or trading advice. Prediction markets involve risk.
                You are solely responsible for any decisions you make based on information
                provided by Polys. Past performance of market participants or markets does
                not indicate future results.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">4. Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must provide accurate information when creating an account. You are
                responsible for maintaining the confidentiality of your credentials and for
                all activity under your account. You must be at least 18 years old to use
                Polys. Notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">5. Acceptable use</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree not to: use Polys for any unlawful purpose; attempt to gain
                unauthorized access to any part of the service; scrape, crawl, or
                systematically extract data beyond normal use; interfere with or disrupt
                the service or its infrastructure; or use the service to transmit harmful,
                abusive, or illegal content.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">6. Subscriptions and billing</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain features require a paid subscription. Subscription fees are billed
                in advance on a monthly or annual basis. Subscriptions automatically renew
                unless cancelled before the renewal date. Refunds are issued at our
                discretion. We reserve the right to modify pricing with reasonable notice.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">7. Intellectual property</h2>
              <p className="text-muted-foreground leading-relaxed">
                Polys and its original content, features, and functionality are owned by
                Polys and protected by applicable intellectual property laws. Market data
                is sourced from third-party APIs and is subject to their respective terms.
                You may not reproduce or distribute Polys content without permission.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">8. Disclaimers and limitation of liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Polys is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
                guarantee the accuracy, completeness, or timeliness of market data. To the
                maximum extent permitted by law, Polys shall not be liable for any indirect,
                incidental, special, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for
                violation of these terms or for any other reason at our discretion. You may
                terminate your account at any time through the settings page.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">10. Changes to terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms of Service from time to time. We will notify you
                of material changes. Continued use of Polys after changes take effect
                constitutes acceptance of the revised terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-subtitle font-semibold">11. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, reach out via our support channels. You
                can also review our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
