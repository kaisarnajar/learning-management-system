import { createWithUniqueSlug, slugifyTitle } from "@/utils/slug";

/** The public URL of a blog post: /blog/<slug>, or /blog/<id> for a post that has no slug yet. */
export function getBlogPostPath(post: { id: string; slug?: string | null }): string {
  return `/blog/${encodeURIComponent(post.slug || post.id)}`;
}

/** slugifyTitle(), with "post" for a title that has no letters or digits. */
export function blogSlugFromTitle(title: string): string {
  return slugifyTitle(title) || "post";
}

/**
 * Creates a blog post with a slug made from its title, the first free one
 * ("-1", "-2", ... when taken), retrying on a concurrent duplicate.
 */
export function createBlogPostWithSlug<T>(
  title: string,
  slugTaken: (slug: string) => Promise<boolean>,
  create: (slug: string) => Promise<T>,
): Promise<T> {
  return createWithUniqueSlug(title, slugTaken, create, 3, blogSlugFromTitle);
}

