import type { NextConfig } from "next";
import { MAX_BLOG_IMAGE_BYTES, MAX_BLOG_IMAGES } from "./lib/blog-limits";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    serverActions: {
      // Default is 1 MB; blog images allow up to 5 MB each (max 10 per post).
      bodySizeLimit: MAX_BLOG_IMAGES * MAX_BLOG_IMAGE_BYTES,
    },
  },
};

export default nextConfig;
