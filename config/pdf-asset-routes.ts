/**
 * Routes whose server bundle contains the PDF generators
 * (services/pdf-generator.ts, utils/*-card-html.ts). Those read fonts, images
 * and the compiled PDF stylesheet from disk at runtime, so next.config.ts
 * adds these files to just these routes' serverless traces
 * (`outputFileTracingIncludes`) instead of to every route.
 *
 * Next matches each key with picomatch `{ contains: true }` against the route
 * path (e.g. `/admin/receipts/[paymentRecordId]`), so a key matches anywhere
 * in the path: "/admin/receipts" also covers `/api/v1/admin/receipts/...`,
 * and there is no end anchor, so a few list routes next to a PDF route
 * (e.g. `/api/v1/admin/payments`) carry the files too. Brackets are glob
 * syntax: escape them to match a dynamic segment literally.
 * tests/unit/pdf-asset-routes.test.ts pins which routes match; after adding a
 * route that renders a PDF, add it here (check with `npx next build` and the
 * route's `.next/server/app/<route>.nft.json`).
 */
export const PDF_ASSET_ROUTE_GLOBS = [
  // Download routes (web and /api/v1).
  "/api/receipt/",
  "/api/certificate/",
  "/api/id-card",
  "/api/student-card/",
  "/api/v1/payments/*/receipt",
  // Admin pages and /api/v1 routes that render or e-mail receipts, certificates and cards.
  "/admin/receipts",
  "/admin/certificates",
  "/admin/payments",
  "/admin/completed-payments",
  "/admin/coupons/finance",
  "/admin/bookstore/orders",
  "/id-card",
  "/attendance/student/*/attendance-card",
  "/grades/student/*/grade-card",
  // Per-course staff routes share a bundle with the attendance and grade card generators.
  "/api/v1/admin/courses/\\[id\\]",
  "/api/v1/teacher/courses/\\[id\\]",
] as const;

/** The files the PDF generators read at runtime, resolved from the project root. */
export const PDF_ASSET_FILES = ["./public/assets/**/*", "./public/fonts/**/*", "./generated/**/*"];
