"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Envelope, User, TrendUpIcon, ChartLine, Lightning, Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    const returnUrl =
      typeof window !== "undefined"
        ? sessionStorage.getItem("polys-return-url") || "/dashboard"
        : "/dashboard";

    const err = await signup(email, password, name);

    if (err) {
      setErrorMsg(err);
      setIsLoading(false);
      return;
    }

    // Supabase may require email confirmation — handle both paths
    setSuccessMsg(
      "Account created! Check your email to confirm your address, then sign in."
    );
    setIsLoading(false);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("polys-return-url");
    }

    // If email confirmation is disabled in Supabase, the session is set automatically
    // and onAuthStateChange in useAuth will pick it up; redirect after short delay
    setTimeout(() => router.push(returnUrl), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-title font-bold">Polys</span>
          </Link>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-display font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Start winning
                <br />
                in prediction markets.
              </h1>
              <p className="text-subtitle text-muted-foreground max-w-lg">
                Join thousands of traders using Polys to stay ahead of the market.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {[
                { icon: TrendUpIcon, title: "Real-Time Analytics", desc: "Live market data and price tracking" },
                { icon: Lightning, title: "Arbitrage Detection", desc: "Spot opportunities across platforms" },
                { icon: ChartLine, title: "Advanced Insights", desc: "Professional-grade market analysis" },
                { icon: Sparkle, title: "Smart Alerts", desc: "Never miss a critical market move" },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" weight="bold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-body mb-1">{feature.title}</h3>
                    <p className="text-small text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-8"
          >
            <div>
              <div className="text-title font-bold text-primary">$127M+</div>
              <div className="text-caption text-muted-foreground">Volume Tracked</div>
            </div>
            <div>
              <div className="text-title font-bold text-primary">15K+</div>
              <div className="text-caption text-muted-foreground">Active Markets</div>
            </div>
            <div>
              <div className="text-title font-bold text-primary">99.9%</div>
              <div className="text-caption text-muted-foreground">Uptime</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col lg:w-1/2">
        <header className="lg:hidden h-16 flex items-center px-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-subtitle font-bold">Polys</span>
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-title font-bold">Create your account</h2>
                <p className="text-body text-muted-foreground">Get started with Polys</p>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-caption text-muted-foreground whitespace-nowrap">
                  sign up with email
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <p className="text-small text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {errorMsg}
                  </p>
                )}
                {successMsg && (
                  <p className="text-small text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md">
                    {successMsg}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    disabled={isLoading}
                    required
                  />
                  <p className="text-caption text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <p className="text-center text-small text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>

              <p className="text-center text-caption text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
