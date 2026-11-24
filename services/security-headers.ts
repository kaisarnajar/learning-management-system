/**
 * Content-Security-Policy construction shared by the proxy (per-request
 * nonce) and tests. Kept free of Node-only imports so it runs on the edge.
 *
 * The policy is emitted as Report-Only unless the CSP_ENFORCE environment
 * variable is "true" (see proxy.ts and docs/TESTING.md); CI runs the
 * end-to-end journeys with it enabled before production is switched over.
 * Either way, violations are reported to CSP_REPORT_PATH: `report-uri` for
 * browsers without the Reporting API, `report-to` (with the
 * Reporting-Endpoints response header) for those with it.
 */

/** Where browsers send CSP violation reports (app/api/csp-report/route.ts). */
export const CSP_REPORT_PATH = "/api/csp-report";
/** The Reporting API group name used by `report-to`. */
export const CSP_REPORT_GROUP = "csp-endpoint";
/** Value of the Reporting-Endpoints response header that defines CSP_REPORT_GROUP. */
export const REPORTING_ENDPOINTS_HEADER = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

export function buildContentSecurityPolicy(nonce: string, options?: { enforce?: boolean }): string {
  const isDev = process.env.NODE_ENV !== "production";
  const r2Host = (() => {
    try {
      return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;
    } catch {
      return null;
    }
  })();

  const imgSources = ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://www.googletagmanager.com"];
  if (r2Host) imgSources.push(`https://${r2Host}`);

  // Direct uploads PUT files to the R2 S3 endpoint (services/direct-upload.ts).
  const connectSources = ["'self'", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://vitals.vercel-insights.com"];
  const r2AccountId = process.env.R2_ACCOUNT_ID?.trim();
  if (r2AccountId && /^[A-Za-z0-9]+$/.test(r2AccountId)) connectSources.push(`https://${r2AccountId}.r2.cloudflarestorage.com`);

  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "https://www.googletagmanager.com"];
  if (isDev) scriptSources.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSources,
    // Tailwind v4 and React inject inline style attributes/tags.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": imgSources,
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": connectSources,
    // 'self' for the in-app PDF previews; Google Maps for the About page embed.
    "frame-src": ["'self'", "https://www.google.com", "https://maps.google.com"],
    // Receipts, certificates and cards are previewed in same-origin iframes.
    "frame-ancestors": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "report-uri": [CSP_REPORT_PATH],
    "report-to": [CSP_REPORT_GROUP],
  };
  if (options?.enforce && !isDev) {
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

/** Static headers applied to every response from next.config.ts. */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // No `preload`: that commits every subdomain to HTTPS permanently and is a
  // decision for the domain owner, not the application.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN, not DENY: the PDF previews (receipt, certificate, ID, grade and
  // attendance cards) load /api/* documents in same-origin iframes.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
