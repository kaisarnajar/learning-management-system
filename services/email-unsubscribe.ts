import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/services/auth-secret";
import { getAppBaseUrl } from "@/services/password-reset";

/**
 * Signed, per-user links for the List-Unsubscribe header of announcement
 * emails. The token is the user id plus an HMAC over it, so a link cannot be
 * forged for another account and needs no database row; opting out only
 * stops announcement emails (in-app notifications continue).
 */

function sign(userId: string): string {
  return createHmac("sha256", `${getAuthSecret()}:email-unsubscribe`).update(userId).digest("hex");
}

export function buildUnsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** The user id the token was issued for, or null when it is malformed or forged. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sign(userId);
  if (given.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8")) ? userId : null;
}

export function buildUnsubscribeUrl(userId: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/api/email/unsubscribe?token=${encodeURIComponent(buildUnsubscribeToken(userId))}`;
}
