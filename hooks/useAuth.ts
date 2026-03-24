"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "pro" | "premium";
  lastSignInAt?: string;
}

export interface Profile {
  id: string;
  name: string | null;
  tier: "free" | "pro" | "premium";
  avatar_url: string | null;
  timezone: string | null;
  email_alerts_enabled: boolean | null;
  portfolio_daily_digest: boolean | null;
  weekly_summary: boolean | null;
}

// Fetch profile row; attempts upsert when row is missing; returns null if table doesn't exist
async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
  meta?: Record<string, unknown>
): Promise<Profile | null> {
  const SELECT_COLS =
    "id, name, tier, avatar_url, timezone, email_alerts_enabled, portfolio_daily_digest, weekly_summary";

  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT_COLS)
    .eq("id", userId)
    .single();

  if (!error) return data as Profile;

  // PGRST116 = "Row not found" — row missing but table exists → upsert a seed row
  if (error.code === "PGRST116") {
    const { data: upserted } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        name:
          (meta?.name as string) ??
          (meta?.full_name as string) ??
          null,
        tier: "free",
        avatar_url: (meta?.avatar_url as string) ?? null,
      })
      .select(SELECT_COLS)
      .single();
    return upserted as Profile | null;
  }

  // Any other error (e.g. table doesn't exist) — return null, caller degrades gracefully
  return null;
}

function buildUser(session: Session, profile: Profile | null): User {
  const u = session.user;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name:
      profile?.name ??
      meta.name ??
      meta.full_name ??
      u.email?.split("@")[0] ??
      "User",
    avatar: profile?.avatar_url ?? meta.avatar_url,
    tier: profile?.tier ?? (meta.tier as User["tier"]) ?? "free",
    lastSignInAt: u.last_sign_in_at ?? undefined,
  };
}

export function useAuth() {
  // createBrowserClient reuses an internal singleton; creating it inside the hook is cheap.
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user + profile from a session object
  const hydrateUser = useCallback(
    async (session: Session | null) => {
      try {
        if (!session) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        const profile = await fetchProfile(supabase, session.user.id, session.user.user_metadata);
        setUser(buildUser(session, profile));
      } catch {
        if (session) {
          setUser(buildUser(session, null));
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        setIsLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      settled = true;
      clearTimeout(timeout);
      hydrateUser(session);
    }).catch(() => {
      settled = true;
      clearTimeout(timeout);
      setUser(null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      settled = true;
      clearTimeout(timeout);
      hydrateUser(session);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase, hydrateUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<string | null> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, tier: "free" } },
      });

      if (error) return error.message;

      // Profile row is created by the auth.users DB trigger (001_profiles.sql).
      // No client-side insert needed here; the trigger fires regardless of whether
      // email confirmation is required.

      // Return a sentinel when email confirmation is pending (no active session)
      if (!data.session) {
        return "CONFIRM_EMAIL";
      }

      return null;
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
  };
}
