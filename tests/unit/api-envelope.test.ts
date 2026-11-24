import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apiError } from "@/utils/api-response";

const root = path.resolve(import.meta.dirname, "../..");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

describe("the API error envelope", () => {
  it("is { success: false, error } plus any extra fields and headers", async () => {
    const response = apiError("Slow down.", 429, { extra: { code: "rate_limited" }, headers: { "Retry-After": "30" } });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toEqual({ success: false, error: "Slow down.", code: "rate_limited" });
  });

  it("is never built by hand in a route handler", () => {
    // An error body written inline (`.json({ error ... })` or `.json({ success: false ...})`)
    // drifts from the envelope; apiError / apiServerError keep `success` on every error.
    const handBuilt = /\.json\(\s*\{\s*(?:success:\s*false\b|error\b)/;
    const offenders = [
      ...routeFiles(path.join(root, "app/api")),
      path.join(root, "services/api-auth.ts"),
      path.join(root, "services/api-content.ts"),
      path.join(root, "services/api-staff.ts"),
    ]
      .filter((file) => handBuilt.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));
    expect(offenders).toEqual([]);
  });
});
