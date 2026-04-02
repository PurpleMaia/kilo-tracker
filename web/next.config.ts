import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@kilo/shared'],
  images: {
    // Allow images served from our API route
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/api/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/api/uploads/**",
      },
    ],
  },
};

export default nextConfig;
