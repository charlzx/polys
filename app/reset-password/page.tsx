"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowLeft } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (err) {
      if (err.message.toLowerCase().includes("session")) {
        setError("This reset link has expired or is invalid. Please request a new one.");
      } else {
        setError(err.message);
      }
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle weight="duotone" className="h-12 w-12 text-primary mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-title font-bold">Password updated</h2>
              <p className="text-body text-muted-foreground">
                Your password has been changed. Redirecting you to sign in…
              </p>
            </div>
            <Link href="/login" className="block text-small text-primary hover:underline font-medium">
              Sign in now
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <h2 className="text-title font-bold">Set a new password</h2>
              <p className="text-body text-muted-foreground">
                Choose a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-small text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                  {error.includes("expired") && (
                    <>
                      {" "}
                      <Link href="/forgot-password" className="underline font-medium">
                        Request a new link
                      </Link>
                    </>
                  )}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
                <p className="text-caption text-muted-foreground">At least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12"
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update password"}
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
