import { isDbError } from "@/utils/db-error";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Longest slug slugifyTitle() returns; keeps URLs readable for long titles. */
export const TITLE_SLUG_MAX_LENGTH = 80;

/**
 * A URL slug for a title in any script, for blog posts. Unlike slugify(),
 * which keeps only ASCII (the course and teacher ids), letters and digits of
 * every script are kept, so an Urdu or Arabic title gives a readable slug
 * rather than nothing. Apostrophes are dropped and accents on Latin letters are dropped ("Qur'ān" gives
 * "quran"); marks on other scripts are kept, since there they are part of the
 * letter. Every other run of characters becomes one "-".
 *
 * The migration 20261128000000_blog_post_slug backfilled existing posts with
 * the same rules in SQL.
 */
export function slugifyTitle(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .toLowerCase()
    .replace(/['\u2018\u2019\u02BC]/g, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return Array.from(slug).slice(0, TITLE_SLUG_MAX_LENGTH).join("").replace(/-+$/, "");
}

export async function uniqueSlug(
  base: string,
  exists: (id: string) => Promise<boolean>,
  toSlug: (text: string) => string = slugify,
): Promise<string> {
  let slug = toSlug(base);
  if (!slug) slug = "item";

  let candidate = slug;
  let n = 1;

  while (await exists(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }

  return candidate;
}

/**
 * Picks a free slug and runs `create` with it. Two admins saving the same
 * title at once can both see the slug as free; the loser's create then fails
 * on the unique index, and this retries with the next candidate instead of
 * surfacing "already exists" for a title that is not a duplicate.
 */
export async function createWithUniqueSlug<T>(
  base: string,
  exists: (id: string) => Promise<boolean>,
  create: (slug: string) => Promise<T>,
  attempts = 3,
  toSlug: (text: string) => string = slugify,
): Promise<T> {
  let suffix = "";
  for (let attempt = 1; ; attempt++) {
    const slug = await uniqueSlug(`${base}${suffix}`, exists, toSlug);
    try {
      return await create(slug);
    } catch (error) {
      if (!isDbError(error, "UNIQUE") || attempt >= attempts) throw error;
      suffix = ` ${attempt + 1}`;
    }
  }
}
