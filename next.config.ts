import type { NextConfig } from "next";
import { FORM_UPLOAD_FALLBACK_MAX_BYTES } from "./config/constants/direct-upload";
import { imageRemotePatterns } from "./config/image-remote-patterns";
import { publicStorageHosts } from "./config/storage-urls";
import { PDF_ASSET_FILES, PDF_ASSET_ROUTE_GLOBS } from "./config/pdf-asset-routes";
import { STATIC_SECURITY_HEADERS } from "./services/security-headers";

// Warn only for a production build or server; dev and tests often run without R2.
const remotePatterns = [
  ...imageRemotePatterns(
    process.env.R2_PUBLIC_URL,
    process.env.NODE_ENV === "production" ? (message) => console.warn(`[next.config] ${message}`) : undefined,
  ),
  // Earlier addresses of the bucket, until their stored URLs are rewritten.
  ...publicStorageHosts()
    .slice(1)
    .map((hostname) => ({ protocol: "https" as const, hostname })),
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // exceljs (finance export) is loaded from node_modules as in the tests rather than bundled.
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core", "puppeteer", "sharp", "firebase-admin", "exceljs"],
  // The PDF generators read fonts, images and generated/pdf.css from disk at
  // runtime: only the routes that can render a PDF carry them.
  outputFileTracingIncludes: Object.fromEntries(PDF_ASSET_ROUTE_GLOBS.map((glob) => [glob, PDF_ASSET_FILES])),
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
    remotePatterns,
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
