import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // Enable modern Next.js features where applicable
    // Adjust based on actual usage in the app
    typedRoutes: true,
    // Partial prerendering can improve TTFB for dynamic routes
    ppr: true,
    // serverActions can be enabled if using Server Actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
