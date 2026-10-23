import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: single-user private app, classic dynamic rendering is simpler than cache components + Suspense everywhere
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.musclewiki.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
