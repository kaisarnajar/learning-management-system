import type { NextConfig } from "next";
import { FORM_UPLOAD_FALLBACK_MAX_BYTES } from "./config/constants/direct-upload";
import { STATIC_SECURITY_HEADERS } from "./services/security-headers";

const r2Domain = process.env.R2_PUBLIC_URL 
  ? new URL(process.env.R2_PUBLIC_URL).hostname 
  : "cdn.your-academy.com";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // exceljs (finance export) is loaded from node_modules as in the tests rather than bundled.
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core", "puppeteer", "sharp", "firebase-admin", "exceljs"],
  // The PDF generators read these from disk at runtime; make sure the
  // serverless bundles carry them.
  outputFileTracingIncludes: {
    "/**/*": ["./public/assets/**/*", "./public/fonts/**/*", "./generated/**/*"],
  },
  experimental: {
    serverActions: {
      // Large files go straight to R2 (services/direct-upload.ts). Form
      // uploads remain for payment screenshots and profile photos (2 MB) and
      // as the fallback for files up to 4 MB in total, plus the other fields;
      // Vercel refuses bodies over 4.5 MB in any case.
      bodySizeLimit: FORM_UPLOAD_FALLBACK_MAX_BYTES + 512 * 1024,
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: STATIC_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
