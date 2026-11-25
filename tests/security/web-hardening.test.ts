import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authContinueUrl, getPostLoginPath, isSafeInternalPath, safeInternalPath } from "@/services/auth-redirect";
import { buildContentSecurityPolicy, CSP_REPORT_PATH, generateNonce, STATIC_SECURITY_HEADERS } from "@/services/security-headers";
import { POST as cspReport } from "@/app/api/csp-report/route";
import { bucketKey, checkRateLimit, enforceRateLimit, rateLimit, RATE_LIMITS, recordFailedSignIn, signInAllowed, type RateLimitRule } from "@/services/rate-limit";
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

  type Proxy = (request: NextRequest, event: unknown) => Promise<Response> | Response;
  async function loadProxy(cspEnforce?: string) {
    vi.resetModules();
    vi.stubEnv("CSP_ENFORCE", cspEnforce ?? "");
    return (await import("@/proxy")).default as unknown as Proxy;
  }
  const page = (path = "/") => new NextRequest(new URL(path, "http://localhost:3000"));

  it("sends the nonce-based CSP as report-only until CSP_ENFORCE is switched on", async () => {
    const proxy = await loadProxy();

    const response = await proxy(page(), {});

    expect(response.headers.get("content-security-policy-report-only")).toContain("script-src");
    expect(response.headers.get("content-security-policy")).toBeNull();
  });

  it("enforces the CSP when CSP_ENFORCE=true, and only then", async () => {
    const proxy = await loadProxy("true");

    const response = await proxy(page("/blog"), {});

    expect(response.headers.get("content-security-policy")).toContain("script-src");
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();

    for (const value of ["false", "1", "TRUE", "yes"]) {
      const lenient = await loadProxy(value);
      expect((await lenient(page(), {})).headers.get("content-security-policy")).toBeNull();
    }
  });

  it("uses a fresh nonce per request and puts it in the policy and the request headers", async () => {
    const proxy = await loadProxy("true");

    const [first, second] = await Promise.all([proxy(page(), {}), proxy(page(), {})]);

    const nonceOf = (response: Response) => /'nonce-([^']+)'/.exec(response.headers.get("content-security-policy") ?? "")?.[1];
    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonceOf(first));
  });

  it("does not put a CSP on API responses", async () => {
    const proxy = await loadProxy("true");

    const response = await proxy(new NextRequest(new URL("/api/v1/courses", "http://localhost:3000")), {});

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
    // Same-origin only: the receipt/certificate/card previews embed /api/* PDFs.
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'self'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("lets the browser PUT direct uploads to the account's R2 endpoint only", () => {
    const directive = (policy: string) => policy.split("; ").find((d) => d.startsWith("connect-src ")) ?? "";
    vi.stubEnv("R2_ACCOUNT_ID", "abc123def");
    expect(directive(buildContentSecurityPolicy("n"))).toContain("https://abc123def.r2.cloudflarestorage.com");
    vi.stubEnv("R2_ACCOUNT_ID", "evil.example.com/x");
    expect(directive(buildContentSecurityPolicy("n"))).not.toContain("r2.cloudflarestorage.com");
  });

  it("asks browsers to report violations in both modes", async () => {
    for (const mode of [undefined, "true"]) {
      const response = await (await loadProxy(mode))(page(), {});
      const policy =
        response.headers.get("content-security-policy") ?? response.headers.get("content-security-policy-report-only") ?? "";
      const directives = policy.split("; ");
      expect(directives).toContain(`report-uri ${CSP_REPORT_PATH}`);
      expect(directives).toContain("report-to csp-endpoint");
      expect(response.headers.get("reporting-endpoints")).toBe(`csp-endpoint="${CSP_REPORT_PATH}"`);
    }
  });

  it("upgrades insecure requests in production only when the policy is enforced", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const enforced = await (await loadProxy("true"))(page(), {});
    expect(enforced.headers.get("content-security-policy")?.split("; ")).toContain("upgrade-insecure-requests");

    const reportOnly = await (await loadProxy())(page(), {});
    expect(reportOnly.headers.get("content-security-policy-report-only")).not.toContain("upgrade-insecure-requests");
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
    expect(STATIC_SECURITY_HEADERS.find((h) => h.key === "X-Frame-Options")?.value).toBe("SAMEORIGIN");
    expect(STATIC_SECURITY_HEADERS.find((h) => h.key === "X-Content-Type-Options")?.value).toBe("nosniff");
  });
});

describe("page protection", () => {
  type Proxy = (request: NextRequest, event: unknown) => Promise<Response> | Response;

  // "/teachers" (public list) shares a prefix with the "/teacher" portal; a
  // guest must reach it, and so must its detail pages.
  it.each(["/courses", "/teachers", "/teachers/some-teacher", "/administration-notes", "/profiles"])(
    "leaves the public page %s alone",
    async (pathname) => {
      const proxy = (await import("@/proxy")).default as unknown as Proxy;
      const response = await proxy(new NextRequest(new URL(pathname, "http://localhost:3000")), {});
      expect(response.status).toBe(200);
    },
  );

  // Auth.js's `auth(handler)` form runs the handler and does not act on a falsy `authorized` result by
  // itself; proxy.ts enforces the decision explicitly (redirect for pages, 401 for API paths).
  it.each(["/admin/courses", "/admin", "/developer", "/teacher", "/teacher/blogs", "/profile/payments"])(
    "redirects anonymous visitors from %s to /login at the edge",
    async (pathname) => {
      const proxy = (await import("@/proxy")).default as unknown as Proxy;
      const response = await proxy(new NextRequest(new URL(`${pathname}?tab=1`, "http://localhost:3000")), {});
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

  it("checking a limit counts nothing", async () => {
    for (let i = 0; i < 5; i++) expect((await checkRateLimit(RULE, "10.10.10.10")).ok).toBe(true);
    expect(await prisma.rateLimitBucket.count()).toBe(0);

    for (let i = 0; i < 3; i++) await rateLimit(RULE, "10.10.10.10");
    expect(await checkRateLimit(RULE, "10.10.10.10")).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 60 });

    await prisma.$executeRawUnsafe(`UPDATE "RateLimitBucket" SET "windowStart" = NOW() - INTERVAL '2 minutes'`);
    expect((await checkRateLimit(RULE, "10.10.10.10")).ok).toBe(true);
  });

  it("only recorded sign-in failures lock an address, and only on their network", async () => {
    for (let i = 0; i < RATE_LIMITS.LOGIN_FAILURE.limit; i++) {
      expect((await signInAllowed("someone@example.com", "10.11.0.1")).ok).toBe(true);
      await recordFailedSignIn("Someone@Example.com", "10.11.0.1");
    }
    expect((await signInAllowed("someone@example.com", "10.11.0.1")).ok).toBe(false);
    expect((await signInAllowed("someone@example.com", "10.11.0.2")).ok).toBe(true);
  });

  describe("when a backend fails", () => {
    beforeEach(() => {
      // A mock endpoint: fetch is stubbed, nothing leaves the machine.
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://upstash.invalid");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("upstash unreachable"));
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("an Upstash error falls back to the Postgres counter, which still limits", async () => {
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await rateLimit(RULE, "10.5.5.5"));

      expect(globalThis.fetch).toHaveBeenCalled();
      expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
      const bucket = await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key: bucketKey(RULE, "10.5.5.5") } });
      expect(bucket.count).toBe(4);
    });

    it("with both down, sign-in is refused with 429 and other rules let the request through", async () => {
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("postgres unreachable"));

      const login = await enforceRateLimit(RATE_LIMITS.LOGIN_FAILURE, "someone@example.com");
      expect(login?.status).toBe(429);
      expect((await checkRateLimit(RATE_LIMITS.LOGIN_FAILURE, "10.6.6.6|someone@example.com")).ok).toBe(false);
      expect((await signInAllowed("someone@example.com", "10.6.6.6")).ok).toBe(false);
      expect(Number(login?.headers.get("retry-after"))).toBeGreaterThan(0);
      expect((await rateLimit(RATE_LIMITS.LOGIN_IP, "10.6.6.6")).ok).toBe(false);

      expect(await enforceRateLimit(RATE_LIMITS.CONTACT_IP, "10.6.6.6")).toBeNull();
      expect((await rateLimit(RULE, "10.6.6.6")).ok).toBe(true);
    });
  });

  describe("the CSP report endpoint", () => {
    const report = (body: string, contentType: string, ip = "10.7.7.7") =>
      cspReport(
        new NextRequest(new URL(CSP_REPORT_PATH, "http://localhost:3000"), {
          method: "POST",
          body,
          headers: { "content-type": contentType, "x-real-ip": ip },
        }),
      );
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());
    const logged = () => vi.mocked(console.warn).mock.calls.map((call) => String(call[1]));

    it("accepts a report-uri report (application/csp-report) and logs only a summary", async () => {
      const response = await report(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://academy.example/reset-password?token=secret-token",
            "violated-directive": "script-src-elem",
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://evil.example/x.js?session=abc",
            "original-policy": "default-src 'self'",
          },
        }),
        "application/csp-report",
      );

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
      expect(logged()).toEqual([JSON.stringify({ directive: "script-src-elem", blocked: "https://evil.example", page: "/reset-password", disposition: "" })]);
      expect(logged().join()).not.toMatch(/secret-token|session=abc|original-policy/);
    });

    it("accepts Reporting API reports (application/reports+json)", async () => {
      const response = await report(
        JSON.stringify([
          { type: "csp-violation", body: { documentURL: "https://academy.example/courses", effectiveDirective: "img-src", blockedURL: "data", disposition: "report" } },
          { type: "deprecation", body: { id: "x" } },
        ]),
        "application/reports+json",
      );

      expect(response.status).toBe(204);
      expect(logged()).toEqual([JSON.stringify({ directive: "img-src", blocked: "data", page: "/courses", disposition: "report" })]);
    });

    it("ignores a malformed or oversized body, still with 204, and stores nothing", async () => {
      const before = await prisma.rateLimitBucket.count();
      expect((await report("not json", "application/csp-report")).status).toBe(204);
      expect((await report(JSON.stringify({ "csp-report": { x: "y".repeat(20_000) } }), "application/csp-report")).status).toBe(204);
      expect(logged()).toEqual([]);
      // Only the rate-limit counter for this network was written.
      expect(await prisma.rateLimitBucket.count()).toBe(before + 1);
    });

    it("is rate-limited per network", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < RATE_LIMITS.CSP_REPORT_IP.limit + 1; i++) statuses.push((await report("{}", "application/csp-report", "10.8.8.8")).status);

      expect(statuses.slice(0, -1).every((status) => status === 204)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
      expect((await report("{}", "application/csp-report", "10.9.9.9")).status).toBe(204);
    });
  });

  it("protects the login, registration and password-reset flows with real limits", () => {
    expect(RATE_LIMITS.LOGIN_FAILURE.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.CHANGE_PASSWORD.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.REGISTER_IP.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.FORGOT_PASSWORD_EMAIL.limit).toBeLessThanOrEqual(5);
    expect(RATE_LIMITS.DOCUMENT_USER.limit).toBeGreaterThan(0);
  });
});
