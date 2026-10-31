import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers compatibility will be added later via @opennextjs/cloudflare or similar
  output: "standalone",
  experimental: {
    // serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.neon.tech" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
