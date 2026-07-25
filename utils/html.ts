/**
 * Utility function to strip HTML tags and decode common HTML entities,
 * returning clean plain text suitable for excerpts, cards, and previews.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    // Replace block-level tags and line breaks with spaces so adjacent text doesn't merge
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // Decode any remaining numerical or named entities
    .replace(/&[a-z0-9#]+;/gi, " ")
    // Collapse multiple whitespace/newlines into a single space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns a clean, plain-text excerpt for a blog post (or similar rich-text content).
 * Prioritizes `excerpt` if present, falls back to `body`, strips HTML, and truncates smoothly.
 */
export function getBlogExcerpt(
  post: { excerpt?: string | null; body: string },
  maxLength = 160,
): string {
  const sourceText = post.excerpt?.trim() ? post.excerpt : post.body;
  const clean = stripHtml(sourceText);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trimEnd() + "…";
}
