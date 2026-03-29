"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendUpIcon, ChartBar, Shield, CurrencyDollar, ArrowRight, X, List } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  { label: "Markets", href: "/markets", icon: TrendUpIcon, description: "Browse prediction markets" },
  { label: "Analytics", href: "/dashboard", icon: ChartBar, description: "Track your portfolio" },
  { label: "Arbitrage", href: "/arbitrage", icon: Shield, description: "Find profit opportunities" },
  { label: "Pricing", href: "/pricing", icon: CurrencyDollar, description: "View pricing plans" },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative h-full flex flex-col bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <Link href="/" className="flex items-center gap-2" onClick={onClose}>
                <span className="text-subtitle font-bold">
                  Poly<span className="text-primary">s</span>
                </span>
              </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close menu"
              >
                <X weight="bold" className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto">
              <div className="space-y-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <link.icon weight="regular" className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-body font-medium">{link.label}</div>
                        <div className="text-caption text-muted-foreground">{link.description}</div>
                      </div>
                      <ArrowRight weight="bold" className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </nav>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="px-4 py-6 border-t border-border space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={onClose}>
                    Log in
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/signup" onClick={onClose}>
                    Sign up
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MobileNavTriggerProps {
  onClick: () => void;
}

export function MobileNavTrigger({ onClick }: MobileNavTriggerProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
      aria-label="Open menu"
    >
      <List weight="bold" className="h-5 w-5" />
    </motion.button>
  );
}
