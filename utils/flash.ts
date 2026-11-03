/**
 * Error feedback carried across a redirect.
 *
 * A server action that fails sends the user back with either `?err=<code>`
 * (one of FLASH_CODES, resolved to copy here) or `?msg=<copy>` for a message
 * that was written for users (a validation message, a business rule). Raw
 * exception text never reaches the URL.
 */
export const FLASH_MESSAGES = {
  unexpected: "Something went wrong. Please try again.",
  invalid: "Please check the form and try again.",
  not_found: "The record no longer exists. Refresh the page and try again.",
  duplicate: "A record with the same value already exists.",
  linked: "This record is linked to other data and cannot be changed this way.",
} as const;

export type FlashCode = keyof typeof FLASH_MESSAGES;

export function isFlashCode(value: string | undefined): value is FlashCode {
  return value !== undefined && Object.prototype.hasOwnProperty.call(FLASH_MESSAGES, value);
}

export type FlashParams = { err?: string; msg?: string };

/** The message to show for the current URL, or null when there is none. */
export function readFlash(params: FlashParams): string | null {
  if (params.msg?.trim()) return params.msg.trim();
  if (isFlashCode(params.err)) return FLASH_MESSAGES[params.err];
  if (params.err) return FLASH_MESSAGES.unexpected;
  return null;
}

/** Query-string fragment (without the leading separator) for a flash. */
export function flashQuery(flash: { code: FlashCode } | { message: string }): string {
  return "code" in flash ? `err=${flash.code}` : `msg=${encodeURIComponent(flash.message)}`;
}

/** Appends a flash to a path that may already carry a query string. */
export function withFlash(path: string, flash: { code: FlashCode } | { message: string }): string {
  return `${path}${path.includes("?") ? "&" : "?"}${flashQuery(flash)}`;
}
