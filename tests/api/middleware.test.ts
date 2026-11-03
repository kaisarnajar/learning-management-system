import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";

type Middleware = (request: NextRequest, event: unknown) => Promise<Response> | Response;
const run = async (request: NextRequest) => (await (middleware as unknown as Middleware)(request, {})) as Response;

const request = (method: string, headers: Record<string, string> = {}, path = "/api/v1/enrollments") =>
  new NextRequest(new URL(path, "http://localhost:3000"), { method, headers });

describe("/api/v1 middleware (CORS and cross-site request guard)", () => {
  afterEach(() => {
    delete process.env.API_ALLOWED_ORIGINS;
  });

  it("lets native clients (no Origin, no Sec-Fetch-Site) through on state-changing methods", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await run(request(method));
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("rejects a cross-origin POST from an origin that is not allow-listed", async () => {
    const response = await run(request("POST", { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ success: false, error: "Cross-site requests are not allowed." });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects a cross-site request flagged by the browser even without an Origin header", async () => {
    const response = await run(request("DELETE", { "sec-fetch-site": "cross-site" }));

    expect(response.status).toBe(403);
  });

  it("allows same-site browser requests", async () => {
    expect((await run(request("POST", { "sec-fetch-site": "same-origin" }))).status).toBe(200);
  });

  it("does not block reads from other origins but also grants them no CORS access", async () => {
    const response = await run(request("GET", { origin: "https://evil.example" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflights with 403 unless the origin is allow-listed", async () => {
    const denied = await run(request("OPTIONS", { origin: "https://evil.example", "access-control-request-method": "POST" }));
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();

    const noOrigin = await run(request("OPTIONS"));
    expect(noOrigin.status).toBe(403);
  });

  it("allows an allow-listed origin: preflight, state-changing request and CORS headers", async () => {
    process.env.API_ALLOWED_ORIGINS = "https://app.example.org/, https://admin.example.org";

    const preflight = await run(request("OPTIONS", { origin: "https://app.example.org", "access-control-request-method": "POST" }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.org");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("Authorization");
    expect(preflight.headers.get("vary")).toBe("Origin");

    const post = await run(request("POST", { origin: "https://APP.example.org/", "sec-fetch-site": "cross-site" }));
    // the browser flags it cross-site, so the guard still refuses it even for an allow-listed origin
    expect(post.status).toBe(403);

    const sameSitePost = await run(request("POST", { origin: "https://app.example.org" }));
    expect(sameSitePost.status).toBe(200);
    expect(sameSitePost.headers.get("access-control-allow-origin")).toBe("https://app.example.org");

    const other = await run(request("POST", { origin: "https://evil.example" }));
    expect(other.status).toBe(403);
  });
});
