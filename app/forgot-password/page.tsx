"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Envelope, ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "/reset-password";

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setIsLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSent(true);
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {sent ? (
          <div className="space-y-4 text-center">
            <CheckCircle weight="duotone" className="h-12 w-12 text-primary mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-title font-bold">Check your inbox</h2>
              <p className="text-body text-muted-foreground">
                We sent a password reset link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                The link expires in 1 hour.
              </p>
            </div>
            <p className="text-small text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline font-medium"
              >
                try again
              </button>
              .
            </p>
            <Link href="/login" className="block text-small text-primary hover:underline font-medium">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <h2 className="text-title font-bold">Reset your password</h2>
              <p className="text-body text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-small text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
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
                    className="pl-10 h-12"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <Link
              href="/login"
              className="flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </AuthLayout>
  );
}
