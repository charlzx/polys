"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "pro" | "premium";
}

function sessionToUser(session: Session | null): User | null {
  if (!session?.user) return null;
  const u = session.user;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    name: meta.name ?? meta.full_name ?? u.email?.split("@")[0] ?? "User",
    email: u.email ?? "",
    avatar: meta.avatar_url,
    tier: (meta.tier as User["tier"]) ?? "free",
  };
}

export function useAuth() {
  // Create one client instance per hook call; createBrowserClient reuses the same
  // underlying GoTrue instance via a module-level singleton inside @supabase/ssr,
  // so this is cheap and safe to call inside a hook.
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(sessionToUser(session));
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session));
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [supabase]
  );

  const signup = useCallback(
    async (email: string, password: string, name: string): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, tier: "free" } },
      });
      return error ? error.message : null;
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
