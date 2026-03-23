"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendUpIcon,
  TrendDownIcon,
  Newspaper,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface NewsItem {
  id: string;
  slug: string;
  question: string;
  description: string;
  image?: string;
  yesOdds: number;
  change24h: number;
  volume: string;
  volume24h: string;
  category: string;
  tags: string[];
  endDate: string;
}

const CATEGORIES = ["All", "Politics", "Crypto", "Sports", "Economics", "Tech", "Entertainment", "General"];
const PAGE_SIZE = 12;

function NewsCardGrid({ item, index }: { item: NewsItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={`/news/${item.slug}`}
        className="flex gap-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all group overflow-hidden p-4 h-full"
      >
        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Badge variant="outline" className="text-caption w-fit">
            {item.category}
          </Badge>
          <p className="text-small font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {item.question}
          </p>
          {item.description && (
            <p className="text-caption text-muted-foreground line-clamp-2 leading-snug">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-auto pt-2 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 font-semibold ${
                item.yesOdds >= 60
                  ? "bg-success/15 text-success"
                  : item.yesOdds <= 40
                  ? "bg-destructive/15 text-destructive"
                  : ""
              }`}
            >
              {item.yesOdds}% YES
            </Badge>
            {item.change24h !== 0 && (
              <span
                className={`text-caption flex items-center gap-0.5 font-medium ${
                  item.change24h > 0 ? "text-success" : "text-destructive"
                }`}
              >
                {item.change24h > 0 ? (
                  <TrendUpIcon weight="bold" className="h-3 w-3" />
                ) : (
                  <TrendDownIcon weight="bold" className="h-3 w-3" />
                )}
                {item.change24h > 0 ? "+" : ""}
                {item.change24h}%
              </span>
            )}
            <span className="text-caption text-muted-foreground ml-auto">{item.volume} Vol</span>
          </div>
        </div>

        {/* Thumbnail */}
        <div className="relative shrink-0 w-24 h-24 rounded-lg bg-secondary/50 overflow-hidden self-start">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.question}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden p-4 flex gap-3">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="shrink-0 w-24 h-24 rounded-lg" />
    </div>
  );
}

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/news?limit=50")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setNewsItems(data);
      })
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = newsItems.filter((item) => {
    const matchCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader searchQuery={searchQuery} onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }} />

      {/* Page header */}
      <div className="border-b border-border bg-gradient-to-b from-secondary/30 to-background">
        <div className="container py-8">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper weight="duotone" className="h-7 w-7 text-primary" />
            <h1 className="text-title md:text-display font-bold">Latest News & Updates</h1>
          </div>
          <p className="text-body text-muted-foreground">
            Top trending prediction markets sorted by volume — your real-time window into what markets are thinking.
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="container">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleCategoryChange(cat)}
                className="shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <main className="container py-8 flex-1">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(9)].map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No news found</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((item, index) => (
                <NewsCardGrid key={item.id} item={item} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <CaretLeft weight="bold" className="h-4 w-4" />
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                    className="w-8 h-8 p-0"
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <CaretRight weight="bold" className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
