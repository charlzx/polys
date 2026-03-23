"use client";

import { useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "pro" | "premium";
}

// Helper to get initial auth state
function getInitialAuthState(): { user: User | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') {
    return { user: null, isAuthenticated: false };
  }
  
  try {
    const mockUser = localStorage.getItem("polys-mock-user");
    if (mockUser) {
      const userData = JSON.parse(mockUser);
      return { user: userData, isAuthenticated: true };
    }
  } catch {
    // Ignore parse errors
  }
  return { user: null, isAuthenticated: false };
}

// Mock auth hook - replace with real auth later
export function useAuth() {
  const [authState, setAuthState] = useState(() => getInitialAuthState());
  const [isLoading, setIsLoading] = useState(true);

  // Recheck auth on mount (for SSR hydration)
  useEffect(() => {
    const state = getInitialAuthState();
    setAuthState(state);
    setIsLoading(false);
  }, []);

  const login = useCallback((userData: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("polys-mock-user", JSON.stringify(userData));
    }
    setAuthState({ user: userData, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("polys-mock-user");
    }
    setAuthState({ user: null, isAuthenticated: false });
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    login,
    logout,
  };
}
