import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

/**
 * Fixed-window rate limiter.
 *
 * Backend selection:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.
 *  - Otherwise a Postgres table (RateLimitBucket) updated with a single atomic upsert.
 *
 * If Upstash fails, the Postgres table takes over for that hit. If both
 * fail, sign-in and account rules (names starting with "auth:") fail closed,
 * so an outage cannot be used to brute-force passwords; every other rule
 * fails open, so a limiter outage never takes the rest of the site down.
 */

export type RateLimitRule = {
  /** Stable name of the protected action, e.g. "auth:login:ip". */
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
  // Failed sign-ins for one address from one network. Only failures count and
  // the network is part of the key, so nobody can lock an account by
  // guessing its password from elsewhere (see recordFailedSignIn).
  LOGIN_FAILURE: { name: "auth:login:failure", limit: 5, windowSeconds: 15 * 60 },
  // Every sign-in attempt from one network: caps a burst before failures land.
  LOGIN_IP: { name: "auth:login:ip", limit: 30, windowSeconds: 15 * 60 },
  CHANGE_PASSWORD: { name: "auth:change-password", limit: 5, windowSeconds: 15 * 60 },
  REGISTER_IP: { name: "auth:register:ip", limit: 5, windowSeconds: 60 * 60 },
  FORGOT_PASSWORD_EMAIL: { name: "auth:forgot:email", limit: 3, windowSeconds: 15 * 60 },
  FORGOT_PASSWORD_IP: { name: "auth:forgot:ip", limit: 10, windowSeconds: 60 * 60 },
  RESEND_VERIFICATION: { name: "auth:resend", limit: 3, windowSeconds: 15 * 60 },
  RESEND_VERIFICATION_IP: { name: "auth:resend:ip", limit: 10, windowSeconds: 60 * 60 },
  GOOGLE_IP: { name: "auth:google:ip", limit: 20, windowSeconds: 15 * 60 },
  CONTACT_IP: { name: "contact:ip", limit: 5, windowSeconds: 60 * 60 },
  UNSUBSCRIBE_IP: { name: "unsubscribe:ip", limit: 30, windowSeconds: 60 * 60 },
  FATWA_ASK_IP: { name: "fatwa:ask:ip", limit: 5, windowSeconds: 60 * 60 },
  COMMENT_USER: { name: "blog:comment:user", limit: 20, windowSeconds: 60 * 60 },
  DOCUMENT_USER: { name: "document:user", limit: 10, windowSeconds: 60 },
  // Presigned upload URLs for one signed-in user (a blog post takes up to 10).
  DIRECT_UPLOAD_USER: { name: "upload:user", limit: 60, windowSeconds: 10 * 60 },
  // Browsers send one report per violation; a page can trigger several.
  CSP_REPORT_IP: { name: "csp:report:ip", limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The stored key: the rule name, then a SHA-256 of the identifier, so the
 * table (and Redis) never hold raw e-mail addresses or IPs.
 */
export function bucketKey(rule: RateLimitRule, identifier: string): string {
  const digest = createHash("sha256").update(normalizeKey(identifier)).digest("hex");
  return `rl:${rule.name}:${digest}`;
}

/** Longer than every rule's window, so pruning never resets a live bucket. */
const BUCKET_RETENTION = "1 day";
/** Share of Postgres hits that also prune old buckets. */
export const PRUNE_PROBABILITY = 0.01;

/** Deletes Postgres buckets whose window started more than a day ago. Returns how many. */
export async function pruneRateLimitBuckets(): Promise<number> {
  return prisma.$executeRaw(Prisma.sql`
    DELETE FROM "RateLimitBucket" WHERE "windowStart" < NOW() - ${BUCKET_RETENTION}::interval
  `);
}

/** About one hit in a hundred prunes, in the background; a failure only logs. */
function maybePruneBuckets(): void {
  if (Math.random() >= PRUNE_PROBABILITY) return;
  pruneRateLimitBuckets().catch((error) => {
    console.error("[rate-limit] pruning old buckets failed:", error);
  });
}

function firstEntry(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

/**
 * Best-effort client IP from proxy headers. Vercel sets
 * x-vercel-forwarded-for itself and a client cannot forge it; x-real-ip is set
 * by Vercel and most reverse proxies. The first x-forwarded-for entry is only
 * a last resort: behind a proxy that appends rather than overwrites, a client
 * controls it.
 */
export function getClientIp(headers: Headers): string {
  return (
    firstEntry(headers.get("x-vercel-forwarded-for")) ??
    firstEntry(headers.get("x-real-ip")) ??
    firstEntry(headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

/** Rules that guard sign-in and account recovery; they deny when no backend can count. */
function failsClosed(rule: RateLimitRule): boolean {
  return rule.name.startsWith("auth:");
}

/** Seconds a fail-closed denial asks the client to wait. */
const FAIL_CLOSED_RETRY_SECONDS = 60;

async function countHit(key: string, rule: RateLimitRule): Promise<number> {
  try {
    const count = await hitUpstash(key, rule);
    if (count !== null) return count;
  } catch (error) {
    console.error("[rate-limit] Upstash error; counting in Postgres instead:", error);
  }
  return hitPostgres(key, rule);
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

async function readUpstash(key: string): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["GET", key]]),
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const data = (await response.json()) as Array<{ result?: string | number | null }>;
  return Number(data?.[0]?.result ?? 0) || 0;
}

async function readPostgres(key: string, rule: RateLimitRule): Promise<number> {
  const windowMs = rule.windowSeconds * 1000;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT "count" FROM "RateLimitBucket"
    WHERE "key" = ${key}
      AND "windowStart" >= NOW() - (${windowMs}::bigint * INTERVAL '1 millisecond')
  `);
  return Number(rows[0]?.count ?? 0);
}

/** Hits already counted in the current window, from whichever backend answers. */
async function readHits(key: string, rule: RateLimitRule): Promise<number> {
  try {
    const count = await readUpstash(key);
    if (count !== null) return count;
  } catch (error) {
    console.error("[rate-limit] Upstash error; reading Postgres instead:", error);
  }
  return readPostgres(key, rule);
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
  maybePruneBuckets();
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

  const key = bucketKey(rule, identifier);
  try {
    const count = await countHit(key, rule);
    const ok = count <= rule.limit;
    return {
      ok,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: ok ? 0 : rule.windowSeconds,
    };
  } catch (error) {
    if (failsClosed(rule)) {
      console.error(`[rate-limit] no backend available; denying ${rule.name}:`, error);
      return { ok: false, remaining: 0, retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS };
    }
    console.error(`[rate-limit] no backend available; allowing ${rule.name}:`, error);
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/**
 * Reports whether `identifier` is still within `rule` without counting a hit.
 * Pair it with `rateLimit` when only some outcomes should count, e.g. failed
 * sign-ins. Fails closed for "auth:" rules like `rateLimit`.
 */
export async function checkRateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }

  try {
    const count = await readHits(bucketKey(rule, identifier), rule);
    const ok = count < rule.limit;
    return { ok, remaining: Math.max(0, rule.limit - count), retryAfterSeconds: ok ? 0 : rule.windowSeconds };
  } catch (error) {
    if (failsClosed(rule)) {
      console.error(`[rate-limit] no backend available; denying ${rule.name}:`, error);
      return { ok: false, remaining: 0, retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS };
    }
    console.error(`[rate-limit] no backend available; allowing ${rule.name}:`, error);
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

function signInKey(email: string, ip: string): string {
  return `${ip}|${email}`;
}

/**
 * Whether a password sign-in for `email` from `ip` may be tried: the address
 * has not failed too often from this network, and the network is not sending
 * a flood of attempts (every attempt counts toward that one).
 */
export async function signInAllowed(email: string, ip: string): Promise<RateLimitResult> {
  const [failures, network] = await Promise.all([
    checkRateLimit(RATE_LIMITS.LOGIN_FAILURE, signInKey(email, ip)),
    rateLimit(RATE_LIMITS.LOGIN_IP, ip),
  ]);
  return failures.ok ? network : failures;
}

/** Counts a failed password sign-in for `email` from `ip`. Successes are never counted. */
export async function recordFailedSignIn(email: string, ip: string): Promise<void> {
  await rateLimit(RATE_LIMITS.LOGIN_FAILURE, signInKey(email, ip));
}

/** Convenience for route handlers: returns a 429 Response when the limit is exceeded. */
export async function enforceRateLimit(
  rule: RateLimitRule,
  identifier: string,
  body: Record<string, unknown> = { success: false, error: RATE_LIMIT_MESSAGE },
): Promise<Response | null> {
  const result = await rateLimit(rule, identifier);
  if (result.ok) return null;
  return Response.json(body, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfterSeconds) },
  });
}
