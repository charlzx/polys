import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
