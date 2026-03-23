"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./useAuth";

export function useAuthGuard(options?: {
  redirectTo?: string;
  redirectIfNotAuth?: boolean;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    if (!isAuthenticated) {
      if (options?.redirectIfNotAuth) {
        setIsRedirecting(true);
        // Store the intended destination
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('polys-return-url', pathname || '/');
        }
        // Redirect to login
        router.push(options.redirectTo || '/login');
      } else {
        // Show modal for non-critical pages
        setShowLoginModal(true);
      }
    }
  }, [isAuthenticated, isLoading, router, pathname, options]);

  const isCheckingAuth = isLoading || isRedirecting || (options?.redirectIfNotAuth && !isAuthenticated);
  const shouldShowContent = !options?.redirectIfNotAuth || (isAuthenticated && !isLoading && !isRedirecting);

  return {
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    shouldShowContent,
    showLoginModal,
    setShowLoginModal,
    requireAuth: () => {
      if (!isAuthenticated) {
        if (options?.redirectIfNotAuth) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('polys-return-url', pathname || '/');
          }
          router.push(options.redirectTo || '/login');
        } else {
          setShowLoginModal(true);
        }
        return false;
      }
      return true;
    },
  };
}
