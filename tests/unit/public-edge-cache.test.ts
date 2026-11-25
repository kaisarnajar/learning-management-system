import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as occupations } from "@/app/api/v1/occupations/route";
import { PUBLIC_EDGE_CACHE_CONTROL, publicJson } from "@/utils/api-response";

const request = (headers: Record<string, string> = {}) =>
  new NextRequest(new URL("/api/v1/occupations", "http://localhost:3000"), { headers });

describe("publicJson (edge caching of public content)", () => {
  it("lets the CDN cache an anonymous response briefly", async () => {
    const response = publicJson(request(), { success: true });

    expect(response.headers.get("cache-control")).toBe(PUBLIC_EDGE_CACHE_CONTROL);
    expect(response.headers.get("vary")).toContain("Authorization");
    expect(await response.json()).toEqual({ success: true });
  });

  it("never stores a response to a request with a Bearer token", () => {
    const response = publicJson(request({ authorization: "Bearer abc" }), { success: true });

    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toContain("Authorization");
  });

  it("is used by the public routes", async () => {
    const response = await occupations(request());

    expect(response.headers.get("cache-control")).toBe(PUBLIC_EDGE_CACHE_CONTROL);
  });
});
