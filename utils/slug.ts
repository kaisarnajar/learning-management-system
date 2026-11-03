import { isDbError } from "@/utils/db-error";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(
  base: string,
  exists: (id: string) => Promise<boolean>,
): Promise<string> {
  let slug = slugify(base);
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
): Promise<T> {
  let suffix = "";
  for (let attempt = 1; ; attempt++) {
    const slug = await uniqueSlug(`${base}${suffix}`, exists);
    try {
      return await create(slug);
    } catch (error) {
      if (!isDbError(error, "UNIQUE") || attempt >= attempts) throw error;
      suffix = ` ${attempt + 1}`;
    }
  }
}
