import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authContinueUrl, getPostLoginPath, isSafeInternalPath, safeInternalPath } from "@/services/auth-redirect";
import { buildContentSecurityPolicy, generateNonce, STATIC_SECURITY_HEADERS } from "@/services/security-headers";
import { enforceRateLimit, rateLimit, RATE_LIMITS, type RateLimitRule } from "@/services/rate-limit";
import { prisma } from "@/utils/prisma";
import nextConfig from "@/next.config";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

const root = path.resolve(__dirname, "../..");

describe("open redirect vectors", () => {
  const VECTORS = [
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "https://evil.example",
    "http://evil.example/admin",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "evil.example",
    "/ok\r\nSet-Cookie: a=b",
    "/ok\0",
    "",
    " /admin",
  ];

  it.each(VECTORS)("rejects %j as a post-login target", (vector) => {
    expect(isSafeInternalPath(vector)).toBe(false);
    expect(safeInternalPath(vector)).toBe("/");
    expect(getPostLoginPath("USER", vector)).toBe("/");
    expect(authContinueUrl(vector)).toBe("/auth/continue?callbackUrl=%2F");
  });

  it.each(["/", "/profile", "/courses/abc?tab=1", "/blog/1#comments"])("keeps the same-site path %s", (path) => {
    expect(safeInternalPath(path)).toBe(path);
  });

  it("never sends a non-admin into /admin or an admin target to another portal", () => {
    expect(getPostLoginPath("TEACHER", "/admin")).toBe("/teacher");
    expect(getPostLoginPath("DEVELOPER", "/profile")).toBe("/admin");
  });
});

describe("the demo seed endpoint is gone", () => {
  it("has no route file for it", () => {
    expect(existsSync(path.join(root, "app/api/dev"))).toBe(false);
  });

  it("is not referenced from any route, page, script or config", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", ".next", ".git", ".claude", "tests"].includes(name)) continue;
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx?|mjs|json|sh)$/.test(name) && /api\/dev\/seed/.test(readFileSync(full, "utf8"))) {
          offenders.push(path.relative(root, full));
        }
      }
    };
    for (const dir of ["app", "components", "services", "utils", "config", "scripts"]) walk(path.join(root, dir));
    expect(offenders).toEqual([]);
  });
});

describe("response headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  type Middleware = (request: NextRequest, event: unknown) => Promise<Response> | Response;
  async function loadMiddleware(cspEnforce?: string) {
    vi.resetModules();
    vi.stubEnv("CSP_ENFORCE", cspEnforce ?? "");
    return (await import("@/middleware")).default as unknown as Middleware;
  }
  const page = (path = "/") => new NextRequest(new URL(path, "http://localhost:3000"));

  it("sends the nonce-based CSP as report-only until CSP_ENFORCE is switched on", async () => {
    const middleware = await loadMiddleware();

    const response = await middleware(page(), {});

    expect(response.headers.get("content-security-policy-report-only")).toContain("script-src");
    expect(response.headers.get("content-security-policy")).toBeNull();
  });

  it("enforces the CSP when CSP_ENFORCE=true, and only then", async () => {
    const middleware = await loadMiddleware("true");

    const response = await middleware(page("/blog"), {});

    expect(response.headers.get("content-security-policy")).toContain("script-src");
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();

    for (const value of ["false", "1", "TRUE", "yes"]) {
      const lenient = await loadMiddleware(value);
      expect((await lenient(page(), {})).headers.get("content-security-policy")).toBeNull();
    }
  });

  it("uses a fresh nonce per request and puts it in the policy and the request headers", async () => {
    const middleware = await loadMiddleware("true");

    const [first, second] = await Promise.all([middleware(page(), {}), middleware(page(), {})]);

    const nonceOf = (response: Response) => /'nonce-([^']+)'/.exec(response.headers.get("content-security-policy") ?? "")?.[1];
    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonceOf(first));
  });

  it("does not put a CSP on API responses", async () => {
    const middleware = await loadMiddleware("true");

    const response = await middleware(new NextRequest(new URL("/api/v1/courses", "http://localhost:3000")), {});

    expect(response.headers.get("content-security-policy")).toBeNull();
  });

  it("builds a policy without inline script or eval in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const policy = buildContentSecurityPolicy("abc123", { enforce: true });
    const directive = (name: string) => policy.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

    expect(directive("script-src")).toContain("'nonce-abc123'");
    expect(directive("script-src")).toContain("'strict-dynamic'");
    expect(directive("script-src")).not.toContain("'unsafe-inline'");
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("generates unpredictable nonces", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce.length).toBeGreaterThanOrEqual(22);
  });

  it("applies the static security headers to every route", async () => {
    const entries = await nextConfig.headers?.();
    const all = entries?.find((entry) => entry.source === "/:path*");
    expect(all?.headers).toEqual(STATIC_SECURITY_HEADERS);

    const names = STATIC_SECURITY_HEADERS.map((header) => header.key);
    expect(names).toEqual(
      expect.arrayContaining(["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]),
    );
    expect(STATIC_SECURITY_HEADERS.find((h) => h.key === "X-Frame-Options")?.value).toBe("DENY");
    expect(STATIC_SECURITY_HEADERS.find((h) => h.key === "X-Content-Type-Options")?.value).toBe("nosniff");
  });
});

describe("page protection", () => {
  type Middleware = (request: NextRequest, event: unknown) => Promise<Response> | Response;

  it("leaves public pages alone", async () => {
    const middleware = (await import("@/middleware")).default as unknown as Middleware;
    const response = await middleware(new NextRequest(new URL("/courses", "http://localhost:3000")), {});
    expect(response.status).toBe(200);
  });

  // Auth.js's `auth(handler)` form runs the handler and does not act on a falsy `authorized` result by
  // itself; middleware.ts enforces the decision explicitly (redirect for pages, 401 for API paths).
  it.each(["/admin/courses", "/developer", "/teacher/blogs", "/profile/payments"])(
    "redirects anonymous visitors from %s to /login at the edge",
    async (pathname) => {
      const middleware = (await import("@/middleware")).default as unknown as Middleware;
      const response = await middleware(new NextRequest(new URL(`${pathname}?tab=1`, "http://localhost:3000")), {});
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location") ?? "", "http://localhost:3000");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(`${pathname}?tab=1`);
    },
  );
});

describe.skipIf(SKIP_WITHOUT_DB)("rate limiting", () => {
  beforeEach(resetDb);

  const RULE: RateLimitRule = { name: "test:rule", limit: 3, windowSeconds: 60 };

  it("allows up to the limit and then refuses with the remaining count at zero", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(RULE, "10.1.1.1"));

    expect(results.map((r) => r.ok)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0, 0]);
    expect(results[3].retryAfterSeconds).toBe(60);
  });

  it("answers 429 with Retry-After and the caller's body", async () => {
    for (let i = 0; i < 3; i++) expect(await enforceRateLimit(RULE, "10.2.2.2", { success: false, error: "slow down" })).toBeNull();

    const response = await enforceRateLimit(RULE, "10.2.2.2", { success: false, error: "slow down" });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
    expect(await response?.json()).toEqual({ success: false, error: "slow down" });
  });

  it("counts each identifier and each rule separately, ignoring case and padding", async () => {
    for (let i = 0; i < 3; i++) await rateLimit(RULE, "Someone@Example.com");

    expect((await rateLimit(RULE, "  someone@example.com ")).ok).toBe(false);
    expect((await rateLimit(RULE, "other@example.com")).ok).toBe(true);
    expect((await rateLimit({ ...RULE, name: "test:other" }, "someone@example.com")).ok).toBe(true);
  });

  it("starts a new window once the old one has elapsed", async () => {
    for (let i = 0; i < 4; i++) await rateLimit(RULE, "10.3.3.3");
    expect((await rateLimit(RULE, "10.3.3.3")).ok).toBe(false);

    await prisma.$executeRawUnsafe(`UPDATE "RateLimitBucket" SET "windowStart" = NOW() - INTERVAL '2 minutes'`);

    expect((await rateLimit(RULE, "10.3.3.3")).ok).toBe(true);
  });

  it("holds under concurrent hits: exactly `limit` get through", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => rateLimit(RULE, "10.4.4.4")));

    expect(results.filter((r) => r.ok)).toHaveLength(3);
  });

  it("protects the login, registration and password-reset flows with real limits", () => {
    expect(RATE_LIMITS.LOGIN.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.REGISTER_IP.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.FORGOT_PASSWORD_EMAIL.limit).toBeLessThanOrEqual(5);
    expect(RATE_LIMITS.DOCUMENT_USER.limit).toBeGreaterThan(0);
  });
});
