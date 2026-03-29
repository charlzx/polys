import type { NextConfig } from "next";

const replitDomains = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map((d) => d.trim())
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: replitDomains,
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/kalshi", destination: "/markets?source=kalshi", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.polymarket.com",
      },
      {
        protocol: "https",
        hostname: "**.gamma-api.polymarket.com",
      },
    ],
  },
};

export default nextConfig;
