"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KalshiRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/markets?source=kalshi");
  }, [router]);
  return null;
}
