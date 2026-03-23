import { useQuery } from "@tanstack/react-query";

export interface GuardianArticle {
  title: string;
  url: string;
  publishedAt: string;
  section: string;
  thumbnail: string | null;
}

export interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  score: number;
  numComments: number;
}

export interface MarketNewsResult {
  guardian: GuardianArticle[];
  reddit: RedditPost[];
  isLoading: boolean;
}

// Build a clean search query from market question + tags
function buildQuery(question: string, tags?: string[]): string {
  let q = question
    .replace(/^will\s+/i, "")
    .replace(/\?$/, "")
    .trim();

  // Append up to 2 tags for more targeted results
  if (tags && tags.length > 0) {
    const tagStr = tags.slice(0, 2).join(" ");
    q = `${q} ${tagStr}`;
  }

  // Truncate to reasonable search length
  return q.slice(0, 120).trim();
}

async function fetchGuardian(q: string): Promise<GuardianArticle[]> {
  const res = await fetch(`/api/news/guardian?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.articles ?? [];
}

async function fetchReddit(q: string): Promise<RedditPost[]> {
  const res = await fetch(`/api/news/reddit?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.posts ?? [];
}

export function useMarketNews(
  question: string | undefined,
  tags?: string[]
): MarketNewsResult {
  const query = question ? buildQuery(question, tags) : "";

  const guardianQuery = useQuery({
    queryKey: ["news", "guardian", query],
    queryFn: () => fetchGuardian(query),
    enabled: query.length >= 5,
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const redditQuery = useQuery({
    queryKey: ["news", "reddit", query],
    queryFn: () => fetchReddit(query),
    enabled: query.length >= 5,
    staleTime: 15 * 60_000,
    retry: 1,
  });

  return {
    guardian: guardianQuery.data ?? [],
    reddit: redditQuery.data ?? [],
    isLoading: guardianQuery.isLoading || redditQuery.isLoading,
  };
}
