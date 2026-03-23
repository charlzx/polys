"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Envelope } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";

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

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="space-y-1.5">
          <h2 className="text-title font-bold">Welcome back</h2>
          <p className="text-body text-muted-foreground">Sign in to your Polys account</p>
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
      </motion.div>
    </AuthLayout>
  );
}
