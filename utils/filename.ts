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
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return base || fallback;
}

/**
 * Builds a Content-Disposition value with an ASCII fallback and an RFC 5987
 * `filename*` carrying the full UTF-8 name.
 */
export function contentDisposition(
  disposition: "inline" | "attachment",
  displayName: string,
  extension: string,
): string {
  const ext = extension.replace(/^\./, "");
  const asciiName = `${toAsciiFilenameBase(displayName)}.${ext}`;
  const utf8Name = encodeURIComponent(`${displayName.replace(/[\r\n"]/g, "").slice(0, 120) || asciiName}`);
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}
