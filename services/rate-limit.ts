import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

/**
 * Fixed-window rate limiter.
 *
 * Backend selection:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.
 *  - Otherwise a Postgres table (RateLimitBucket) updated with a single atomic upsert.
 *
 * The limiter fails open: if the backend is unreachable the request is
 * allowed and the error is logged, so an outage of the limiter never takes
 * the application down.
 */

export type RateLimitRule = {
  /** Stable name of the protected action, e.g. "auth:login". */
  name: string;
  /** Maximum number of hits allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export const RATE_LIMITS = {
  LOGIN: { name: "auth:login", limit: 5, windowSeconds: 15 * 60 },
  LOGIN_IP: { name: "auth:login:ip", limit: 30, windowSeconds: 15 * 60 },
  REGISTER_IP: { name: "auth:register:ip", limit: 5, windowSeconds: 60 * 60 },
  FORGOT_PASSWORD_EMAIL: { name: "auth:forgot:email", limit: 3, windowSeconds: 15 * 60 },
  FORGOT_PASSWORD_IP: { name: "auth:forgot:ip", limit: 10, windowSeconds: 60 * 60 },
  RESEND_VERIFICATION: { name: "auth:resend", limit: 3, windowSeconds: 15 * 60 },
  RESEND_VERIFICATION_IP: { name: "auth:resend:ip", limit: 10, windowSeconds: 60 * 60 },
  GOOGLE_IP: { name: "auth:google:ip", limit: 20, windowSeconds: 15 * 60 },
  CONTACT_IP: { name: "contact:ip", limit: 5, windowSeconds: 60 * 60 },
  FATWA_ASK_IP: { name: "fatwa:ask:ip", limit: 5, windowSeconds: 60 * 60 },
  COMMENT_USER: { name: "blog:comment:user", limit: 20, windowSeconds: 60 * 60 },
  DOCUMENT_USER: { name: "document:user", limit: 10, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().slice(0, 200);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

async function hitUpstash(key: string, rule: RateLimitRule): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSeconds), "NX"],
    ]),
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const data = (await response.json()) as Array<{ result?: number }>;
  const count = data?.[0]?.result;
  return typeof count === "number" ? count : null;
}

async function hitPostgres(key: string, rule: RateLimitRule): Promise<number> {
  const windowMs = rule.windowSeconds * 1000;
  // Single atomic upsert: reset the counter when the window has elapsed,
  // otherwise increment it. Returns the count within the current window.
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowMs}::bigint * INTERVAL '1 millisecond')
          THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowMs}::bigint * INTERVAL '1 millisecond')
          THEN NOW()
        ELSE "RateLimitBucket"."windowStart"
      END
    RETURNING "count"
  `);
  return Number(rows[0]?.count ?? 1);
}

/**
 * Records a hit for `identifier` under `rule` and reports whether it is within the limit.
 * `identifier` is typically an IP address, an e-mail address or a user id.
 */
export async function rateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }

  const key = `rl:${rule.name}:${normalizeKey(identifier)}`;
  try {
    const count = (await hitUpstash(key, rule)) ?? (await hitPostgres(key, rule));
    const ok = count <= rule.limit;
    return {
      ok,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: ok ? 0 : rule.windowSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] backend error; allowing request:", error);
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/** Convenience for route handlers: returns a 429 Response when the limit is exceeded. */
export async function enforceRateLimit(
  rule: RateLimitRule,
  identifier: string,
  body: Record<string, unknown> = { error: RATE_LIMIT_MESSAGE },
): Promise<Response | null> {
  const result = await rateLimit(rule, identifier);
  if (result.ok) return null;
  return Response.json(body, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfterSeconds) },
  });
}
