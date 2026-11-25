/**
 * Helpers for building safe download filenames and Content-Disposition
 * headers. User names may contain quotes or non-Latin-1 characters (Arabic,
 * Urdu); putting them raw into the header breaks the quoted-string or makes
 * the runtime reject the header value.
 */

/** ASCII-only, filesystem-safe base name (letters, digits, dash, underscore). */
export function toAsciiFilenameBase(value: string | null | undefined, fallback = "document"): string {
  const base = (value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 80);
  return base || fallback;
}

/** RFC 5987 ext-value encoding: percent-encode everything but attr-char. */
function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Builds a Content-Disposition value with an ASCII fallback and an RFC 5987
 * `filename*` carrying the full UTF-8 name. Both carry the extension.
 */
export function contentDisposition(
  disposition: "inline" | "attachment",
  displayName: string,
  extension: string,
): string {
  const ext = extension.replace(/^\./, "");
  const asciiName = `${toAsciiFilenameBase(displayName)}.${ext}`;
  // Control characters and quotes have no place in a file name.
  const cleaned = displayName.replace(/[\u0000-\u001F\u007F"\\/]/g, "").trim().slice(0, 120);
  const utf8Name = cleaned ? `${cleaned}.${ext}` : asciiName;
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeRfc5987(utf8Name)}`;
}
