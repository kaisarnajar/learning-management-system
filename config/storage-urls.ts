/**
 * The base URLs public uploads are served from: R2_PUBLIC_URL (where new
 * files go) first, then R2_LEGACY_PUBLIC_URLS, a comma-separated list of
 * earlier addresses of the same bucket (e.g. its r2.dev URL after moving to
 * a custom domain). Stored URLs on a legacy base are still recognised as
 * ours (deleting, profile photos), allowed by the CSP and next/image, until
 * scripts/optimize-public-images.ts has rewritten them.
 * No imports: proxy.ts and next.config.ts read this too.
 */
export function publicStorageBaseUrls(): string[] {
  const legacy = (process.env.R2_LEGACY_PUBLIC_URLS ?? "").split(",");
  return [process.env.R2_PUBLIC_URL ?? "", ...legacy]
    .map((base) => base.trim().replace(/\/+$/, ""))
    .filter((base, index, all) => base.length > 0 && all.indexOf(base) === index);
}

/** The host names of publicStorageBaseUrls(); invalid URLs are skipped. */
export function publicStorageHosts(): string[] {
  const hosts: string[] = [];
  for (const base of publicStorageBaseUrls()) {
    try {
      const host = new URL(base).hostname.toLowerCase();
      if (!hosts.includes(host)) hosts.push(host);
    } catch {
      // Not a URL: nothing to allow.
    }
  }
  return hosts;
}

/** The object key (uploads/…) of a stored public URL or path, with any of our bases removed. */
export function stripPublicStorageBase(urlOrPath: string): string {
  for (const base of publicStorageBaseUrls()) {
    if (urlOrPath.startsWith(`${base}/`)) return urlOrPath.slice(base.length + 1);
  }
  return urlOrPath.replace(/^\/+/, "");
}
