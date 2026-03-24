"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "polys-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, "all"); } catch { /* noop */ }
    setVisible(false);
  };

  const necessary = () => {
    try { localStorage.setItem(STORAGE_KEY, "necessary"); } catch { /* noop */ }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
        >
          <div className="container max-w-screen-xl py-4 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Cookie
                  weight="duotone"
                  className="h-5 w-5 text-primary shrink-0 mt-0.5"
                />
                <p className="text-small text-muted-foreground leading-relaxed">
                  We use cookies for authentication and to save your preferences.
                  No advertising or tracking cookies.{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={necessary}
                  className="text-small"
                >
                  Necessary only
                </Button>
                <Button size="sm" onClick={accept} className="text-small">
                  Accept all
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
