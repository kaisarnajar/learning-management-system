/**
 * Content-Security-Policy construction shared by the middleware (per-request
 * nonce) and tests. Kept free of Node-only imports so it runs on the edge.
 *
 * The policy is emitted as Report-Only first (C15) and switched to enforcing
 * once the security regression suite confirms no inline-script violations.
 */
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

  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "https://www.googletagmanager.com"];
  if (isDev) scriptSources.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSources,
    // Tailwind v4 and React inject inline style attributes/tags.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": imgSources,
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://vitals.vercel-insights.com"],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
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
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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
