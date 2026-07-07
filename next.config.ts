import type { NextConfig } from "next";
import { MAX_BLOG_IMAGE_BYTES, MAX_BLOG_IMAGES } from "./services/blog-limits";

const r2Domain = process.env.R2_PUBLIC_URL 
  ? new URL(process.env.R2_PUBLIC_URL).hostname 
  : "cdn.your-academy.com";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core"],
  experimental: {
    serverActions: {
      // Default is 1 MB; blog images allow up to 5 MB each (max 10 per post).
      bodySizeLimit: MAX_BLOG_IMAGES * MAX_BLOG_IMAGE_BYTES,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2Domain,
      },
    ],
  },
};

export default nextConfig;
