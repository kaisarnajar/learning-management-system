/**
 * Escapes a value for safe interpolation into HTML text or attribute content.
 *
 * Use this for every `${…}` of user- or database-sourced data inside the
 * server-rendered PDF templates (utils/*-html.ts) and email templates.
 * `null`/`undefined` become an empty string; other values are stringified.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes a value and converts line breaks to `<br />` for multi-line text blocks. */
export function escapeHtmlMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}
