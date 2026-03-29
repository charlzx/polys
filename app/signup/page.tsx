"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Envelope, User } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/AuthLayout";

function mapAuthError(msg: string): {
  field: "name" | "email" | "password" | "general";
  text: string;
} {
  const lower = msg.toLowerCase();
  if (lower.includes("email") && lower.includes("already")) {
    return { field: "email", text: "An account with this email already exists." };
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return { field: "email", text: "Enter a valid email address." };
  }
  if (lower.includes("password") && lower.includes("characters")) {
    return { field: "password", text: "Password must be at least 6 characters." };
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return { field: "password", text: "Choose a stronger password." };
  }
  return { field: "general", text: msg };
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (password.length < 8) {
      setFieldErrors({ password: "Password must be at least 8 characters." });
      return;
    }

    setIsLoading(true);

    const returnUrl =
      typeof window !== "undefined"
        ? sessionStorage.getItem("polys-return-url") || "/dashboard"
        : "/dashboard";

    const errMsg = await signup(email, password, name);

    if (errMsg === "CONFIRM_EMAIL") {
      setSuccessMsg(
        "Account created! Check your inbox to confirm your email, then sign in."
      );
      setIsLoading(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("polys-return-url");
      }
      setTimeout(() => router.push("/login"), 3000);
      return;
    }

    if (errMsg) {
      const { field, text } = mapAuthError(errMsg);
      setFieldErrors({ [field]: text });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
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
          <h2 className="text-title font-bold">Create your account</h2>
          <p className="text-body text-muted-foreground">Get started with Polys</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {fieldErrors.general && (
            <p className="text-small text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {fieldErrors.general}
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
                className={`pl-10 h-12 ${fieldErrors.name ? "border-destructive" : ""}`}
                disabled={isLoading}
                required
              />
            </div>
            {fieldErrors.name && (
              <p className="text-caption text-destructive">{fieldErrors.name}</p>
            )}
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
            {fieldErrors.password ? (
              <p className="text-caption text-destructive">{fieldErrors.password}</p>
            ) : (
              <p className="text-caption text-muted-foreground">
                Must be at least 8 characters
              </p>
            )}
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
      </motion.div>
    </AuthLayout>
  );
}
