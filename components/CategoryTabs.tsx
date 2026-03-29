"use client";

import { motion } from "framer-motion";
import { Lightning } from "@phosphor-icons/react";
import { categories } from "@/data/categories";

interface CategoryTabsProps {
  selected: string;
  onChange: (cat: string) => void;
}

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-0.5 py-2 overflow-x-auto scrollbar-hide">
      {categories.map((cat) => {
        const isSelected = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`relative shrink-0 flex items-center gap-1 px-3 py-1.5 text-small font-medium rounded-full transition-colors min-h-[36px] ${
              isSelected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="category-pill"
                className="absolute inset-0 bg-secondary rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {cat === "Trending" && (
                <Lightning weight="fill" className="h-3.5 w-3.5" />
              )}
              {cat}
            </span>
          </button>
        );
      })}
    </div>
  );
}
