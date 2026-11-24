import { createHash, timingSafeEqual } from "node:crypto";

/**
 * True when the request carries `Authorization: Bearer <CRON_SECRET>`, which
 * is how Vercel Cron calls the routes listed in vercel.json. Without a
 * configured secret every request is refused, so a cron route is never open.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
