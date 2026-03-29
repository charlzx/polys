"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie, CaretDown, CaretUp, ToggleLeft, ToggleRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "polys-cookie-consent";

interface ConsentState {
  necessary: true;
  analytics: boolean;
}

const CATEGORIES = [
  {
    key: "necessary" as const,
    label: "Necessary",
    always: true,
    description:
      "Required for the site to work. Handles authentication, session management, and your display preferences (theme, layout). These cannot be disabled.",
    examples: "Supabase auth session, theme preference, cookie consent choice",
  },
  {
    key: "analytics" as const,
    label: "Analytics",
    always: false,
    description:
      "Help us understand how people use Polys so we can improve the product. We may use tools like a privacy-friendly analytics provider to track page views and feature usage. No personal data is sold.",
    examples: "Page views, feature interactions, session duration",
  },
];

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({ necessary: true, analytics: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const save = (value: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch { /* noop */ }
    setVisible(false);
  };

  const acceptAll = () => save({ necessary: true, analytics: true });
  const saveChoices = () => save(consent);

  const toggle = (key: "analytics") => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
        >
          <div className="container max-w-screen-xl px-4 md:px-6">

            {/* Collapsed summary row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Cookie weight="duotone" className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-small text-muted-foreground leading-relaxed">
                  We use necessary cookies to run the site and, with your consent, analytics
                  cookies to improve the product.{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 text-small text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expanded ? (
                    <CaretUp weight="bold" className="h-3.5 w-3.5" />
                  ) : (
                    <CaretDown weight="bold" className="h-3.5 w-3.5" />
                  )}
                  {expanded ? "Hide details" : "Show details"}
                </button>
                <Button variant="outline" size="sm" onClick={saveChoices} className="text-small">
                  {expanded ? "Save choices" : "Necessary only"}
                </Button>
                <Button size="sm" onClick={acceptAll} className="text-small">
                  Accept all
                </Button>
              </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border py-4 space-y-3">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.key}
                        className="flex items-start gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-small font-semibold">{cat.label}</span>
                            {cat.always && (
                              <span className="text-caption text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                Always on
                              </span>
                            )}
                          </div>
                          <p className="text-caption text-muted-foreground leading-relaxed">
                            {cat.description}
                          </p>
                          <p className="text-caption text-muted-foreground/60 italic">
                            Examples: {cat.examples}
                          </p>
                        </div>

                        {/* Toggle */}
                        <div className="shrink-0 mt-0.5">
                          {cat.always ? (
                            <ToggleRight
                              weight="fill"
                              className="h-7 w-7 text-primary opacity-50 cursor-not-allowed"
                            />
                          ) : (
                            <button
                              onClick={() => toggle(cat.key as "analytics")}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={`${consent[cat.key as "analytics"] ? "Disable" : "Enable"} ${cat.label}`}
                            >
                              {consent[cat.key as "analytics"] ? (
                                <ToggleRight weight="fill" className="h-7 w-7 text-primary" />
                              ) : (
                                <ToggleLeft weight="fill" className="h-7 w-7" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
