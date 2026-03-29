"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Broadcast } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";

const plans = [
  {
    id: "free",
    name: "Explorer",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "Basic market browsing",
      "5 alerts/day",
      "7-day historical data",
      "Top 50 markets",
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    id: "pro",
    name: "Trader",
    price: "$79",
    period: "/month",
    description: "For serious traders",
    features: [
      "Everything in Free",
      "Unlimited alerts",
      "Full historical data",
      "All markets",
      "Mobile apps",
      "Community access",
    ],
    cta: "Start Pro Trial",
    ctaVariant: "default" as const,
    popular: true,
  },
  {
    id: "elite",
    name: "Professional",
    price: "$199",
    period: "/month",
    description: "For power users",
    features: [
      "Everything in Pro",
      "Real-time arbitrage alerts",
      "Cross-platform scanning",
      "Whale tracking",
      "API access (10k req/day)",
      "Priority support",
    ],
    cta: "Start Professional Trial",
    ctaVariant: "default" as const,
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For institutions",
    features: [
      "Everything in Professional",
      "Unlimited API access",
      "White-label options",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    popular: false,
  },
];

export default function PricingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader onMobileNavOpen={() => setMobileNavOpen(true)} />

      {/* Hero */}
      <section className="py-16 md:py-24 border-b border-border">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-[2rem] md:text-display font-bold mb-4">Choose your plan</h1>
            <p className="text-body text-muted-foreground">
              Get the insights you need to make smarter trading decisions. Start free and upgrade
              anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-24 flex-1">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${
                    plan.popular ? "border-primary shadow-lg" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-subtitle">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-4">
                      <span className="text-display font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-small">
                          <Check
                            weight="bold"
                            className="h-4 w-4 text-primary shrink-0 mt-0.5"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button variant={plan.ctaVariant} className="w-full mt-6" asChild>
                      <Link
                        href={
                          plan.id === "enterprise" ? "/contact" : "/auth?mode=signup"
                        }
                      >
                        {plan.cta}
                        <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ or CTA */}
      <section className="py-16 border-t border-border bg-secondary/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-title font-bold mb-4">Ready to get started?</h2>
            <p className="text-body text-muted-foreground mb-8">
              Join thousands of traders using Polys to gain an edge in prediction markets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/auth?mode=signup">
                  Start for free
                  <ArrowRight weight="bold" className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/dashboard">View demo</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
