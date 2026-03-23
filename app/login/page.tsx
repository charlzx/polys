"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Envelope, TrendUpIcon, ChartLine, Lightning, Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// Map Supabase error messages to specific form fields
function mapAuthError(msg: string): { field: "email" | "password" | "general"; text: string } {
  const lower = msg.toLowerCase();
  if (lower.includes("email") && lower.includes("invalid")) {
    return { field: "email", text: "Enter a valid email address." };
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return { field: "password", text: "Incorrect email or password." };
  }
  if (lower.includes("email not confirmed")) {
    return { field: "email", text: "Please confirm your email before signing in." };
  }
  if (lower.includes("user not found")) {
    return { field: "email", text: "No account found with this email." };
  }
  return { field: "general", text: msg };
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});

    const returnUrl =
      typeof window !== "undefined"
        ? sessionStorage.getItem("polys-return-url") || "/dashboard"
        : "/dashboard";

    const errMsg = await login(email, password);

    if (errMsg) {
      const { field, text } = mapAuthError(errMsg);
      setFieldErrors({ [field]: text });
      setIsLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("polys-return-url");
    }
    router.push(returnUrl);
  };

  const handleSocialLogin = (provider: string) => {
    // Social login is not configured — no-op placeholder
    console.log(`Social login not configured: ${provider}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding & Features (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-title font-bold">Polys</span>
          </Link>

          {/* Main Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-display font-bold mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Track markets.
                <br />
                Beat the odds.
              </h1>
              <p className="text-subtitle text-muted-foreground max-w-lg">
                Professional prediction market intelligence for traders who take it seriously.
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

          {/* Footer Stats */}
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
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-subtitle font-bold">Polys</span>
          </Link>
        </header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-title font-bold">Welcome back</h2>
                <p className="text-body text-muted-foreground">Sign in to your Polys account</p>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 text-body"
                  onClick={() => handleSocialLogin("google")}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-body"
                  onClick={() => handleSocialLogin("github")}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-body"
                  onClick={() => handleSocialLogin("apple")}
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-caption text-muted-foreground whitespace-nowrap">
                  or continue with email
                </span>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {fieldErrors.general && (
                  <p className="text-small text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {fieldErrors.general}
                  </p>
                )}

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
                      className={`pl-10 h-12 ${fieldErrors.email ? "border-destructive" : ""}`}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-caption text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-12 ${fieldErrors.password ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    required
                  />
                  {fieldErrors.password && (
                    <p className="text-caption text-destructive">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-small cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    Remember me
                  </label>
                  <Link href="/forgot-password" className="text-small text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <p className="text-center text-small text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up
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
