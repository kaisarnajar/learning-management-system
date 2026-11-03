import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Data cache for public, read-mostly content (homepage sections, public
 * detail pages). Entries live for PUBLIC_CACHE_SECONDS and are dropped early
 * by revalidatePublicContent(), which the admin/teacher actions call next to
 * their revalidatePath("/").
 *
 * Why data caching rather than cached pages: the CSP middleware issues a
 * per-request nonce, so HTML must be rendered per request (a cached page
 * would carry a stale nonce and its scripts would be refused once the CSP is
 * enforced), and prerendering pages at build time would make `next build`
 * depend on the production database. Caching the queries keeps both
 * properties while taking the repeated reads off the database.
 */
export const PUBLIC_CACHE_SECONDS = 300;
export const PUBLIC_CONTENT_TAG = "public-content";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

/** unstable_cache stores JSON, so Date values come back as strings; restore them. */
function reviveDates<T>(value: T): T {
  if (typeof value === "string") {
    return (ISO_DATE.test(value) ? new Date(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = reviveDates(inner);
    }
    return out as T;
  }
  return value;
}

/**
 * Wraps a query so its result is shared across requests for up to
 * PUBLIC_CACHE_SECONDS. `name` must be unique per wrapped function; the
 * arguments become part of the cache key automatically.
 */
export function cachedPublic<Args extends unknown[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
  extraTags: string[] = [],
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(fn, [`public:${name}`], {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: [PUBLIC_CONTENT_TAG, ...extraTags],
  });
  return async (...args: Args) => reviveDates(await cached(...args));
}

/** Drops every cached public query; call it from actions that change public content. */
export function revalidatePublicContent(): void {
  revalidateTag(PUBLIC_CONTENT_TAG, "max");
}
